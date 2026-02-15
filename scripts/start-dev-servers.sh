#!/bin/bash
# Dev server startup with port checking and graceful handling
# Run from project root: ./scripts/start-dev-servers.sh
#
# Configuration is read from .env.docker.local (project root)
# Command-line args override config file values.
#
# Usage:
#   ./scripts/start-dev-servers.sh                    # Start servers (skip if already running)
#   ./scripts/start-dev-servers.sh --restart|--force  # Kill existing and restart fresh
#
# Features:
# - Reads port configuration from .env.docker.local
# - Checks if ports are already in use before starting
# - Skips starting a server if it's already running (unless --restart/--force)
# - Only kills processes it started on Ctrl+C
# - Logs output to app/logs/ for AI agent access

# Don't exit on error - we handle errors gracefully
set +e

# Get script directory and project root early (needed for config loading)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Agent config - check new location first, then legacy
AGENT_CONFIG="$PROJECT_ROOT/.env.docker.local"
LEGACY_AGENT_CONFIG="$(dirname "$PROJECT_ROOT")/.env.agent.local"

# Load agent configuration
if [ -f "$AGENT_CONFIG" ]; then
    echo "Loading agent config from $AGENT_CONFIG"
    set -a  # Export all variables
    source "$AGENT_CONFIG"
    set +a
elif [ -f "$LEGACY_AGENT_CONFIG" ]; then
    echo "Loading agent config from $LEGACY_AGENT_CONFIG (legacy location)"
    set -a
    source "$LEGACY_AGENT_CONFIG"
    set +a
else
    echo "WARNING: No .env.docker.local found at $AGENT_CONFIG"
    echo "Using defaults. Create .env.docker.local with AGENT_NAME and BASE_PORT."
    echo ""
fi

# Set defaults (can be overridden by config or CLI)
RESTART_MODE=false
AGENT_NAME="${AGENT_NAME:-default}"
BASE_PORT="${BASE_PORT:-3000}"

# Calculate ports from BASE_PORT (can be overridden individually in config)
NEXTJS_PORT="${NEXTJS_PORT:-$BASE_PORT}"
CONVEX_HTTP_PORT="${CONVEX_HTTP_PORT:-$((BASE_PORT + 211))}"
CONVEX_ADMIN_PORT="${CONVEX_ADMIN_PORT:-$((BASE_PORT + 210))}"
CONVEX_DASHBOARD_PORT="${CONVEX_DASHBOARD_PORT:-$((BASE_PORT + 3791))}"
MAILPIT_WEB_PORT="${MAILPIT_WEB_PORT:-$((BASE_PORT + 5025))}"
MAILPIT_SMTP_PORT="${MAILPIT_SMTP_PORT:-$((BASE_PORT + 1025))}"

# Parse command-line arguments (override config)
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --restart|-r|--force|-f)
            RESTART_MODE=true
            shift
            ;;
        --agent)
            AGENT_NAME="$2"
            shift 2
            ;;
        --port) # Base port override, recalculates all ports
            BASE_PORT="$2"
            NEXTJS_PORT="$BASE_PORT"
            CONVEX_HTTP_PORT=$((BASE_PORT + 211))
            CONVEX_ADMIN_PORT=$((BASE_PORT + 210))
            CONVEX_DASHBOARD_PORT=$((BASE_PORT + 3791))
            MAILPIT_WEB_PORT=$((BASE_PORT + 5025))
            MAILPIT_SMTP_PORT=$((BASE_PORT + 1025))
            shift 2
            ;;
        --convex-port)
            CONVEX_HTTP_PORT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Export for Docker Compose
export CONVEX_HTTP_PORT
export CONVEX_ADMIN_PORT
export CONVEX_DASHBOARD_PORT
export MAILPIT_WEB_PORT
export MAILPIT_SMTP_PORT

# Export for Next.js 
# (Next.js picks up PORT env var automatically for `next start`, but `next dev` might need -p)
export PORT=$NEXTJS_PORT 

# Set Docker Compose Project Name
# This ensures containers are named after the agent (e.g. "mark-backend-1")
# For "default", we use "artifact-review" to match the standard directory name / backward compat.
if [ "$AGENT_NAME" = "default" ]; then
    export COMPOSE_PROJECT_NAME="artifact-review"
else
    # Sanitize agent name just in case
    export COMPOSE_PROJECT_NAME=$(echo "$AGENT_NAME" | tr -cd '[:alnum:]-_')
fi

echo "========================================"
echo "  Dev Server Startup ($AGENT_NAME)"
echo "  Docker Project: $COMPOSE_PROJECT_NAME"
echo "  App Port:    $NEXTJS_PORT"
echo "  Convex Port: $CONVEX_HTTP_PORT (Admin: $CONVEX_ADMIN_PORT)"
echo "  Tmux Sessions: ${AGENT_NAME}-nextjs, ${AGENT_NAME}-convex-dev, ${AGENT_NAME}-stripe"
if [ "$RESTART_MODE" = true ]; then
    echo "  Mode: RESTART (killing existing tmux sessions)"
else
    echo "  Mode: START (skip if running)"
fi
echo "========================================"

# Calculate orchestrator directory (already have SCRIPT_DIR and PROJECT_ROOT from config loading)
ORCHESTRATOR_DIR="$AGENT_DIR/../.."

# DNS Check (skip in CI mode)
# With dnsmasq configured, *.loc resolves automatically - just verify it works
if [ -z "$CI" ] && [ -z "$HOSTED" ]; then
    echo ""
    echo "🔍 Checking DNS configuration..."

    DNS_OK=true
    # Production-like: {service}.{agent}.loc (for E2E tests)
    # Convex: {agent}.convex.{cloud|site}.loc (mirrors production)
    # Dev-only: {agent}.{service}.loc (local tools only)
    DNS_DOMAINS=(
        "$AGENT_NAME.loc"                    # App
        "api.$AGENT_NAME.loc"                # Next.js API routes
        "$AGENT_NAME.convex.cloud.loc"       # Convex sync (WebSocket)
        "$AGENT_NAME.convex.site.loc"        # Convex HTTP/storage
        "$AGENT_NAME.mailpit.loc"            # Mailpit (dev-only)
        "$AGENT_NAME.convex.loc"             # Convex Dashboard (dev-only)
    )

    # Test if .loc resolution works (dnsmasq wildcard or /etc/hosts)
    if command -v getent &> /dev/null; then
        for domain in "${DNS_DOMAINS[@]}"; do
            if getent hosts "$domain" &> /dev/null; then
                echo "  ✅ $domain resolves"
            else
                echo "  ❌ $domain does not resolve"
                DNS_OK=false
            fi
        done
    else
        # Fallback: check /etc/hosts if getent not available
        for domain in "${DNS_DOMAINS[@]}"; do
            if grep -q "127.0.0.1.*$domain" /etc/hosts 2>/dev/null; then
                echo "  ✅ $domain found in /etc/hosts"
            else
                echo "  ❌ $domain not found"
                DNS_OK=false
            fi
        done
    fi

    if [ "$DNS_OK" = false ]; then
        echo ""
        echo "ERROR: DNS not configured for agent '$AGENT_NAME'"
        echo ""
        echo "Setup dnsmasq (one-time, handles ALL *.loc domains):"
        echo "  sudo $ORCHESTRATOR_DIR/scripts/setup-dnsmasq.sh install"
        echo ""
        echo "Also ensure orchestrator proxy is running (routes DNS to services):"
        echo "  cd $ORCHESTRATOR_DIR/orchestrator && ./start.sh"
        echo ""
        echo "Then retry this command."
        exit 1
    fi
fi

# Register with orchestrator
echo ""
echo "📡 Registering with orchestrator..."
if [ -f "$ORCHESTRATOR_DIR/scripts/register-agent.js" ]; then
    # Port mapping:
    # - CONVEX_ADMIN_PORT (3220) → convexCloudPort (WebSocket/sync)
    # - CONVEX_HTTP_PORT (3221) → convexSitePort (HTTP/storage)
    node "$ORCHESTRATOR_DIR/scripts/register-agent.js" \
        "$AGENT_NAME" \
        "$NEXTJS_PORT" \
        "$CONVEX_ADMIN_PORT" \
        "$CONVEX_HTTP_PORT" \
        "$MAILPIT_WEB_PORT" \
        "$CONVEX_DASHBOARD_PORT"
else
    echo "⚠️  Orchestrator not found at $ORCHESTRATOR_DIR"
    echo "   Agent will work locally but won't be accessible via DNS"
fi
echo ""
APP_DIR="$PROJECT_ROOT/app"

# Verify app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "ERROR: app/ directory not found at $APP_DIR"
    exit 1
fi

# Change to app directory
cd "$APP_DIR"

# Update .env.local for Convex
# Server-side (CLI) uses localhost, browser uses DNS names for proxy routing
if [ -f .env.local ]; then
    # Construct the URLs
    # Server-side: direct localhost connection for CLI tools
    ADMIN_URL="https://${AGENT_NAME}.convex.cloud.loc"
    # Browser-side: DNS names for proxy routing (works with orchestrator)
    # Uses HTTPS since orchestrator proxy terminates TLS on port 443
    # Falls back to localhost if not using DNS routing
    if [ -n "$AGENT_NAME" ] && [ "$AGENT_NAME" != "default" ]; then
        # Convex cloud (WebSocket/sync) - mirrors *.convex.cloud
        CONVEX_CLOUD_URL="https://$AGENT_NAME.convex.cloud.loc"
        # Convex site (HTTP/storage) - mirrors *.convex.site
        CONVEX_SITE_URL="https://$AGENT_NAME.convex.site.loc"
    else
        CONVEX_CLOUD_URL="https://${AGENT_NAME}.convex.cloud.loc"
        CONVEX_SITE_URL="http://127.0.0.1:$CONVEX_HTTP_PORT"
    fi

    # Update CONVEX_SELF_HOSTED_URL (Admin Port - server-side only)
    if grep -q "CONVEX_SELF_HOSTED_URL" .env.local; then
        sed -i "s|CONVEX_SELF_HOSTED_URL=.*|CONVEX_SELF_HOSTED_URL=$ADMIN_URL|" .env.local
    else
        echo "CONVEX_SELF_HOSTED_URL=$ADMIN_URL" >> .env.local
    fi

    # Update NEXT_PUBLIC_CONVEX_URL (Client - browser-side sync/WebSocket)
    if grep -q "NEXT_PUBLIC_CONVEX_URL" .env.local; then
        sed -i "s|NEXT_PUBLIC_CONVEX_URL=.*|NEXT_PUBLIC_CONVEX_URL=$CONVEX_CLOUD_URL|" .env.local
    else
        echo "NEXT_PUBLIC_CONVEX_URL=$CONVEX_CLOUD_URL" >> .env.local
    fi

    # Update NEXT_PUBLIC_CONVEX_HTTP_URL (Client - browser-side HTTP/storage)
    if grep -q "NEXT_PUBLIC_CONVEX_HTTP_URL" .env.local; then
        sed -i "s|NEXT_PUBLIC_CONVEX_HTTP_URL=.*|NEXT_PUBLIC_CONVEX_HTTP_URL=$CONVEX_SITE_URL|" .env.local
    else
        echo "NEXT_PUBLIC_CONVEX_HTTP_URL=$CONVEX_SITE_URL" >> .env.local
    fi

    # Disable CONVEX_DEPLOYMENT if present (causes conflicts with self-hosted)
    if grep -q "^CONVEX_DEPLOYMENT" .env.local; then
        sed -i "s|^CONVEX_DEPLOYMENT|# CONVEX_DEPLOYMENT|" .env.local
    fi
else
    # Create if missing - use DNS names for browser if agent name is set
    # Browser URLs use HTTPS since orchestrator proxy terminates TLS
    echo "CONVEX_SELF_HOSTED_URL=https://${AGENT_NAME}.convex.cloud.loc" > .env.local
    if [ -n "$AGENT_NAME" ] && [ "$AGENT_NAME" != "default" ]; then
        echo "NEXT_PUBLIC_CONVEX_URL=https://$AGENT_NAME.convex.cloud.loc" >> .env.local
        echo "NEXT_PUBLIC_CONVEX_HTTP_URL=https://$AGENT_NAME.convex.site.loc" >> .env.local
    else
        echo "NEXT_PUBLIC_CONVEX_URL=https://${AGENT_NAME}.convex.cloud.loc" >> .env.local
        echo "NEXT_PUBLIC_CONVEX_HTTP_URL=http://127.0.0.1:$CONVEX_HTTP_PORT" >> .env.local
    fi
fi

# Add Novu vars for notification support (from .env.nextjs.local)
if [ -f .env.nextjs.local ]; then
    echo "" >> .env.local
    echo "# Novu Notifications (auto-added from .env.nextjs.local)" >> .env.local
    grep -E '^(NOVU_|NEXT_PUBLIC_NOVU_)' .env.nextjs.local >> .env.local 2>/dev/null || true
fi

# EXPORT the URL to ensure npx convex dev picks it up
export CONVEX_SELF_HOSTED_URL="https://${AGENT_NAME}.convex.cloud.loc"
unset CONVEX_DEPLOYMENT

# Set NODE_EXTRA_CA_CERTS for mkcert TLS trust (required for npx convex dev with HTTPS)
if [ -z "$NODE_EXTRA_CA_CERTS" ]; then
    MKCERT_CA="$(mkcert -CAROOT 2>/dev/null)/rootCA.pem"
    if [ -f "$MKCERT_CA" ]; then
        export NODE_EXTRA_CA_CERTS="$MKCERT_CA"
    fi
fi


# Create logs directory
mkdir -p logs

# Function to check if a port is in use
check_port() {
    local port=$1
    lsof -i :$port >/dev/null 2>&1
    return $?
}

# Function to get process using a port
get_port_process() {
    local port=$1
    lsof -i :$port -t 2>/dev/null | head -1
}

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(get_port_process $port)
    if [ -n "$pid" ]; then
        kill $pid 2>/dev/null
        sleep 1
        # Force kill if still running
        if check_port $port; then
            kill -9 $pid 2>/dev/null
            sleep 1
        fi
        return 0
    fi
    return 1
}

# Note: Restart mode is now handled in the tmux section below

# Check and start Docker App (Desktop)
# Check and start Docker Daemon (Linux/Ubuntu friendly)
echo "Checking Docker Daemon..."
if ! docker info > /dev/null 2>&1; then
    echo "  [START] Docker daemon is not running. Attempting to start..."
    # Try systemd (standard on Ubuntu)
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start docker
    elif command -v service >/dev/null 2>&1; then
        sudo service docker start
    else
        echo "  [ERROR] Could not start Docker. Please start it manually."
        exit 1
    fi

    # Wait for Docker to be ready
    MAX_RETRIES=30
    COUNT=0
    while ! docker info > /dev/null 2>&1; do
        if [ $COUNT -ge $MAX_RETRIES ]; then
            echo "  [ERROR] Docker failed to start after checking."
            exit 1
        fi
        echo "  [WAIT] Waiting for Docker to initialize..."
        sleep 2
        COUNT=$((COUNT+1))
    done
    echo "  [OK] Docker Daemon is ready"
else
    echo "  [SKIP] Docker Daemon is already running"
fi

# Check for shared Novu instance (info only - orchestrator manages it)
echo "Checking for shared Novu..."
if docker ps --filter "name=novu-api" --format '{{.Names}}' 2>/dev/null | grep -q "^novu-api$"; then
    echo "  ✅ Shared Novu available"
    echo "     Web: https://novu.loc (or http://localhost:4200)"
    echo "     API: https://api.novu.loc (or http://localhost:3002)"
else
    echo "  ⚠️  Shared Novu not running"
    echo "     Start orchestrator: cd $ORCHESTRATOR_DIR/orchestrator && ./start.sh"
fi

# Check and start Docker services (Convex, Mailpit only)
# NOTE: Novu is NOT managed by agents - it's orchestrator infrastructure
echo ""
echo "Checking Docker services (Convex, Mailpit)..."
COMPOSE_FILES="-f docker-compose.yml"

# Change to project root for compose if needed, or use relative paths
# NOTE: The script is running from APP_DIR ($PROJECT_ROOT/app).
# The compose files are in PROJECT_ROOT.
# We need to be careful about context.
# Best approach: Run compose from PROJECT_ROOT context.

pushd "$PROJECT_ROOT" > /dev/null

# Generate mkcert CA bundle for resend-proxy TLS trust if needed
# MKCERT_CERTS_PATH can be set in .env.docker.local (default: orchestrator repo)
CERTS_DIR="${MKCERT_CERTS_PATH:-$PROJECT_ROOT/../orchestrator-artifact-review/certs}"
CA_BUNDLE="$CERTS_DIR/ca-certificates-with-mkcert.crt"
if [ ! -f "$CA_BUNDLE" ] && [ -f "$CERTS_DIR/rootCA.pem" ]; then
    echo "  Generating CA bundle for resend-proxy TLS trust..."
    # Need to get system CAs from a running backend container or from host
    if docker ps --filter "name=${AGENT_NAME}-backend" --format "{{.Names}}" | grep -q "${AGENT_NAME}-backend"; then
        docker exec "${AGENT_NAME}-backend" cat /etc/ssl/certs/ca-certificates.crt > "$CERTS_DIR/system-ca.crt" 2>/dev/null
    elif [ -f /etc/ssl/certs/ca-certificates.crt ]; then
        cp /etc/ssl/certs/ca-certificates.crt "$CERTS_DIR/system-ca.crt"
    fi
    if [ -f "$CERTS_DIR/system-ca.crt" ]; then
        cat "$CERTS_DIR/system-ca.crt" "$CERTS_DIR/rootCA.pem" > "$CA_BUNDLE"
        echo "  CA bundle generated successfully"
    else
        echo "  WARNING: Could not generate CA bundle - resend-proxy TLS may fail"
    fi
fi

# Check if containers are running
CONTAINER_NAME="${AGENT_NAME}-backend"
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "  [START] Starting Docker services..."
    docker compose --env-file "$PROJECT_ROOT/.env.docker.local" $COMPOSE_FILES up -d

    # Wait for backend container to be healthy
    echo "  [WAIT] Waiting for $CONTAINER_NAME to be ready..."
    MAX_RETRIES=30
    COUNT=0
    while ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; do
        if [ $COUNT -ge $MAX_RETRIES ]; then
            echo "  [ERROR] $CONTAINER_NAME failed to start after ${MAX_RETRIES} attempts"
            echo "  Check logs: docker logs $CONTAINER_NAME"
            exit 1
        fi
        echo "  [WAIT] Attempt $((COUNT+1))/$MAX_RETRIES..."
        sleep 2
        COUNT=$((COUNT+1))
    done

    # Additional wait for container to be fully initialized
    echo "  [WAIT] Container started, waiting for initialization..."
    sleep 5
    echo "  [OK] Docker services ready"
else
    echo "  [SKIP] Docker services already running"
fi

popd > /dev/null

# Set up local Convex functions
echo "Initializing local Convex functions..."

# Derive the admin key from the container's persisted instance credentials
# The admin key is COMPUTED from instance_name + instance_secret, not stored directly
# This ensures we always use the key that matches what the container expects
echo "  Deriving admin key from container credentials..."
CONTAINER_NAME="${AGENT_NAME}-backend"
CONVEX_ADMIN_KEY=$(docker exec "$CONTAINER_NAME" ./generate_admin_key.sh 2>/dev/null | grep -v "^Admin key:" | tail -1)

if [ -z "$CONVEX_ADMIN_KEY" ]; then
    echo "ERROR: Failed to derive admin key from container. Is $CONTAINER_NAME running?"
    echo "  Try: docker ps | grep $CONTAINER_NAME"
    exit 1
fi

echo "  Admin key derived successfully"

# Initialize local Convex functions (Non-interactive)
# We use the explicit URL and Admin Key to bypass login/project selection prompts
npx convex dev --once --url "https://${AGENT_NAME}.convex.cloud.loc" --admin-key "$CONVEX_ADMIN_KEY" || { echo "ERROR: Failed to push to local Convex"; exit 1; }

# =============================================================================
# TMUX SESSION MANAGEMENT
# =============================================================================
# Sessions follow the pattern: {agent}-{service}
# See: docs/design/tmux-sessions.md
#
# Sessions:
#   {agent}-nextjs     - Next.js dev server
#   {agent}-convex-dev - npx convex dev watcher
#   {agent}-stripe     - Stripe CLI tunnel

NEXTJS_SESSION="${AGENT_NAME}-nextjs"
CONVEX_SESSION="${AGENT_NAME}-convex-dev"
STRIPE_SESSION="${AGENT_NAME}-stripe"

# Helper: Check if tmux session exists
session_exists() {
    tmux has-session -t "$1" 2>/dev/null
}

# Helper: Start tmux session if not running
start_session() {
    local session_name="$1"
    local working_dir="$2"
    local command="$3"

    if session_exists "$session_name"; then
        echo "  [SKIP] $session_name already running"
        return 0
    fi

    echo "  [START] Creating tmux session: $session_name"
    tmux new-session -d -s "$session_name" -c "$working_dir" "$command"

    if session_exists "$session_name"; then
        echo "  [OK] $session_name started"
        return 0
    else
        echo "  [ERROR] Failed to start $session_name"
        return 1
    fi
}

# Helper: Kill tmux session
kill_session() {
    local session_name="$1"
    if session_exists "$session_name"; then
        echo "  Killing $session_name..."
        tmux kill-session -t "$session_name" 2>/dev/null
    fi
}

# If restart mode, kill existing tmux sessions
if [ "$RESTART_MODE" = true ]; then
    echo ""
    echo "Stopping existing tmux sessions..."
    kill_session "$NEXTJS_SESSION"
    kill_session "$CONVEX_SESSION"
    kill_session "$STRIPE_SESSION"
    echo ""
fi

# -----------------------------------------------------------------------------
# Start Convex Dev Watcher (tmux)
# -----------------------------------------------------------------------------
echo ""
echo "Starting Convex function watcher..."
# Note: Admin key contains | character, must be quoted to avoid shell interpretation
# NODE_EXTRA_CA_CERTS must be passed explicitly for mkcert TLS trust
start_session "$CONVEX_SESSION" "$APP_DIR" \
    "NODE_EXTRA_CA_CERTS='${NODE_EXTRA_CA_CERTS}' npx convex dev --tail-logs always --url https://${AGENT_NAME}.convex.cloud.loc --admin-key '${CONVEX_ADMIN_KEY}'"

# -----------------------------------------------------------------------------
# Start Next.js Dev Server (tmux)
# -----------------------------------------------------------------------------
echo ""
echo "Starting Next.js dev server..."
start_session "$NEXTJS_SESSION" "$APP_DIR" \
    "npm run dev -- -p $NEXTJS_PORT"

# Wait a moment for Next.js to bind port
sleep 2

# -----------------------------------------------------------------------------
# Start Stripe CLI Tunnel (tmux)
# -----------------------------------------------------------------------------
echo ""
echo "Starting Stripe CLI tunnel..."

# Get the Convex site URL for webhook forwarding
if [ -n "$AGENT_NAME" ] && [ "$AGENT_NAME" != "default" ]; then
    WEBHOOK_URL="https://$AGENT_NAME.convex.site.loc/stripe/webhook"
else
    WEBHOOK_URL="http://127.0.0.1:$CONVEX_HTTP_PORT/stripe/webhook"
fi

start_session "$STRIPE_SESSION" "$APP_DIR" \
    "stripe listen --forward-to $WEBHOOK_URL"

# -----------------------------------------------------------------------------
# Sync Novu Workflows (after Next.js is up)
# -----------------------------------------------------------------------------
sync_novu_workflows() {
    echo ""
    echo "Syncing Novu workflows..."

    # Get Novu secret key from env file
    local secret_key=""
    if [ -f "$APP_DIR/.env.nextjs.local" ]; then
        secret_key=$(grep "^NOVU_SECRET_KEY=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2)
    fi

    if [ -z "$secret_key" ]; then
        echo "  ⚠️  NOVU_SECRET_KEY not found, skipping workflow sync"
        echo "     Run ./scripts/setup-novu-org.sh to configure Novu"
        return 0
    fi

    local bridge_url="https://${AGENT_NAME}.loc/api/novu"
    local novu_api_url="https://api.novu.loc"

    # Wait for Next.js bridge endpoint to be ready
    echo "  Waiting for bridge endpoint..."
    local max_attempts=15
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        # Check if bridge endpoint responds (any HTTP response means Next.js is up)
        if curl -sk --max-time 2 "$bridge_url" >/dev/null 2>&1; then
            echo "  ✅ Bridge endpoint ready"
            break
        fi
        echo "  [WAIT] Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        echo "  ⚠️  Bridge endpoint not responding after ${max_attempts} attempts"
        echo "     Check: tmux attach -t $NEXTJS_SESSION"
        echo "     Manual sync: npx novu@latest sync --bridge-url $bridge_url --secret-key \$NOVU_SECRET_KEY --api-url $novu_api_url"
        return 0
    fi

    # Check if Novu API is available
    local novu_status
    novu_status=$(curl -sk --max-time 5 -o /dev/null -w "%{http_code}" "$novu_api_url/v1/health" 2>/dev/null || echo "000")
    if [ "$novu_status" = "000" ]; then
        echo "  ⚠️  Novu API not reachable at $novu_api_url"
        echo "     Ensure orchestrator is running: cd ../orchestrator-artifact-review && ./start.sh"
        return 0
    fi

    # Sync workflows via Novu API
    echo "  Syncing to Novu..."
    local response
    response=$(curl -sk --max-time 30 -X POST "${novu_api_url}/v1/bridge/sync" \
        -H "Authorization: ApiKey ${secret_key}" \
        -H "Content-Type: application/json" \
        -d "{\"bridgeUrl\": \"${bridge_url}\"}" 2>&1)

    # Check if sync succeeded
    if echo "$response" | jq -e '.data' >/dev/null 2>&1; then
        local workflow_count
        workflow_count=$(echo "$response" | jq -r '.data.workflows | length' 2>/dev/null || echo "?")
        echo "  ✅ Novu workflows synced ($workflow_count workflows)"
    else
        local error_msg
        error_msg=$(echo "$response" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "$response")
        echo "  ⚠️  Novu sync failed: $error_msg"
        echo "     Manual sync: npx novu@latest sync --bridge-url $bridge_url --secret-key \$NOVU_SECRET_KEY --api-url $novu_api_url"
    fi
}

# Run Novu sync (non-blocking, failures are warnings not errors)
sync_novu_workflows

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "========================================"
echo "  Tmux Sessions for $AGENT_NAME"
echo "========================================"
echo ""
echo "Status:"
session_exists "$NEXTJS_SESSION" && echo "  ✅ $NEXTJS_SESSION" || echo "  ❌ $NEXTJS_SESSION"
session_exists "$CONVEX_SESSION" && echo "  ✅ $CONVEX_SESSION" || echo "  ❌ $CONVEX_SESSION"
session_exists "$STRIPE_SESSION" && echo "  ✅ $STRIPE_SESSION" || echo "  ❌ $STRIPE_SESSION"
echo ""
echo "URLs:"
echo "  App:          https://$AGENT_NAME.loc"
echo "  Convex Sync:  https://$AGENT_NAME.convex.cloud.loc"
echo "  Convex HTTP:  https://$AGENT_NAME.convex.site.loc"
echo "  Mailpit:      https://$AGENT_NAME.mailpit.loc"
echo ""
echo "Commands:"
echo "  View logs:    tmux capture-pane -t $NEXTJS_SESSION -p -S -50"
echo "  Attach:       tmux attach -t $NEXTJS_SESSION"
echo "  List:         tmux ls"
echo "  Stop all:     tmux kill-session -t $NEXTJS_SESSION && tmux kill-session -t $CONVEX_SESSION"
echo ""
echo "Sessions persist independently - safe to close this terminal."
echo "========================================"
