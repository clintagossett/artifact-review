#!/bin/bash
# Dev server startup with port checking and graceful handling
# Run from project root: ./scripts/start-dev-servers.sh
#
# Configuration is read from ../.env.agent.local (agent directory)
# Command-line args override config file values.
#
# Usage:
#   ./scripts/start-dev-servers.sh                    # Start servers (skip if already running)
#   ./scripts/start-dev-servers.sh --restart|--force  # Kill existing and restart fresh
#
# Features:
# - Reads port configuration from .env.agent.local
# - Checks if ports are already in use before starting
# - Skips starting a server if it's already running (unless --restart/--force)
# - Only kills processes it started on Ctrl+C
# - Logs output to app/logs/ for AI agent access

# Don't exit on error - we handle errors gracefully
set +e

# Get script directory and project root early (needed for config loading)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AGENT_DIR="$(dirname "$PROJECT_ROOT")"
AGENT_CONFIG="$AGENT_DIR/.env.agent.local"

# Load agent configuration from .env.agent.local
if [ -f "$AGENT_CONFIG" ]; then
    echo "Loading agent config from $AGENT_CONFIG"
    # Source the config file to get variables
    set -a  # Export all variables
    source "$AGENT_CONFIG"
    set +a
else
    echo "WARNING: No .env.agent.local found at $AGENT_CONFIG"
    echo "Using defaults. Create .env.agent.local with AGENT_NAME and BASE_PORT."
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
if [ "$RESTART_MODE" = true ]; then
    echo "  Mode: RESTART (killing existing servers)"
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
    # Dev-only: {agent}.{service}.loc (local tools only)
    DNS_DOMAINS=(
        "$AGENT_NAME.loc"              # App
        "api.$AGENT_NAME.loc"          # API (production-like)
        "$AGENT_NAME.mailpit.loc"      # Mailpit (dev-only)
        "$AGENT_NAME.convex.loc"       # Convex Dashboard (dev-only)
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
        echo "Option 1 - Setup dnsmasq (recommended, one-time for ALL agents):"
        echo "  sudo $ORCHESTRATOR_DIR/scripts/setup-dnsmasq.sh install"
        echo ""
        echo "Option 2 - Manual /etc/hosts entries:"
        echo "  sudo $ORCHESTRATOR_DIR/scripts/setup-dns.sh add $AGENT_NAME"
        echo ""
        echo "Then retry this command."
        exit 1
    fi
fi

# Register with orchestrator
echo ""
echo "📡 Registering with orchestrator..."
if [ -f "$ORCHESTRATOR_DIR/scripts/register-agent.js" ]; then
    node "$ORCHESTRATOR_DIR/scripts/register-agent.js" \
        "$AGENT_NAME" \
        "$NEXTJS_PORT" \
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
    ADMIN_URL="http://127.0.0.1:$CONVEX_ADMIN_PORT"
    # Browser-side: DNS name for proxy routing (works with orchestrator)
    # Falls back to localhost if not using DNS routing
    if [ -n "$AGENT_NAME" ] && [ "$AGENT_NAME" != "default" ]; then
        CLIENT_URL="http://api.$AGENT_NAME.loc"
    else
        CLIENT_URL="http://127.0.0.1:$CONVEX_HTTP_PORT"
    fi

    # Update CONVEX_SELF_HOSTED_URL (Admin Port - server-side only)
    if grep -q "CONVEX_SELF_HOSTED_URL" .env.local; then
        sed -i "s|CONVEX_SELF_HOSTED_URL=.*|CONVEX_SELF_HOSTED_URL=$ADMIN_URL|" .env.local
    else
        echo "CONVEX_SELF_HOSTED_URL=$ADMIN_URL" >> .env.local
    fi

    # Update NEXT_PUBLIC_CONVEX_URL (Client - browser-side, uses DNS)
    if grep -q "NEXT_PUBLIC_CONVEX_URL" .env.local; then
        sed -i "s|NEXT_PUBLIC_CONVEX_URL=.*|NEXT_PUBLIC_CONVEX_URL=$CLIENT_URL|" .env.local
    else
        echo "NEXT_PUBLIC_CONVEX_URL=$CLIENT_URL" >> .env.local
    fi

    # Update NEXT_PUBLIC_CONVEX_HTTP_URL (same as client URL)
    if grep -q "NEXT_PUBLIC_CONVEX_HTTP_URL" .env.local; then
        sed -i "s|NEXT_PUBLIC_CONVEX_HTTP_URL=.*|NEXT_PUBLIC_CONVEX_HTTP_URL=$CLIENT_URL|" .env.local
    else
        echo "NEXT_PUBLIC_CONVEX_HTTP_URL=$CLIENT_URL" >> .env.local
    fi

    # Disable CONVEX_DEPLOYMENT if present (causes conflicts with self-hosted)
    if grep -q "^CONVEX_DEPLOYMENT" .env.local; then
        sed -i "s|^CONVEX_DEPLOYMENT|# CONVEX_DEPLOYMENT|" .env.local
    fi
else
    # Create if missing - use DNS names for browser if agent name is set
    echo "CONVEX_SELF_HOSTED_URL=http://127.0.0.1:$CONVEX_ADMIN_PORT" > .env.local
    if [ -n "$AGENT_NAME" ] && [ "$AGENT_NAME" != "default" ]; then
        echo "NEXT_PUBLIC_CONVEX_URL=http://api.$AGENT_NAME.loc" >> .env.local
        echo "NEXT_PUBLIC_CONVEX_HTTP_URL=http://api.$AGENT_NAME.loc" >> .env.local
    else
        echo "NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:$CONVEX_HTTP_PORT" >> .env.local
        echo "NEXT_PUBLIC_CONVEX_HTTP_URL=http://127.0.0.1:$CONVEX_HTTP_PORT" >> .env.local
    fi
fi

# EXPORT the URL to ensure npx convex dev picks it up
export CONVEX_SELF_HOSTED_URL="http://127.0.0.1:$CONVEX_ADMIN_PORT"
unset CONVEX_DEPLOYMENT


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

# Use the configured port variables for checks
CONVEX_PORT=$CONVEX_HTTP_PORT 

# If restart mode, kill existing servers first
if [ "$RESTART_MODE" = true ]; then
    echo "Stopping existing servers..."

    if check_port $CONVEX_PORT; then
        EXISTING_PID=$(get_port_process $CONVEX_PORT)
        echo "  Killing Convex on port $CONVEX_PORT (PID: $EXISTING_PID)..."
        kill_port $CONVEX_PORT
        echo "  [OK] Convex stopped"
    else
        echo "  Convex not running on $CONVEX_PORT"
    fi

    if check_port $NEXTJS_PORT; then
        EXISTING_PID=$(get_port_process $NEXTJS_PORT)
        echo "  Killing Next.js on port $NEXTJS_PORT (PID: $EXISTING_PID)..."
        kill_port $NEXTJS_PORT
        echo "  [OK] Next.js stopped"
    else
        echo "  Next.js not running on $NEXTJS_PORT"
    fi

    echo ""
fi

# Track which servers we start
CONVEX_PID=""
NEXT_PID=""
NOVU_PID=""
CONVEX_RUNNING=false
NEXTJS_RUNNING=false

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
    echo "     Web: http://novu.loc (or http://localhost:4200)"
    echo "     API: http://api.novu.loc (or http://localhost:3002)"
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

if ! docker compose $COMPOSE_FILES ps | grep -q "Up"; then
    echo "  [START] Starting Docker services..."
    docker compose $COMPOSE_FILES up -d
else
    echo "  [SKIP] Docker services already running"
fi

popd > /dev/null

# Set up local Convex functions
echo "Initializing local Convex functions..."
# Initialize local Convex functions (Non-interactive)
# We use the explicit URL and Admin Key to bypass login/project selection prompts
CONVEX_ADMIN_KEY="0f04f3f1dbbd5d2c09f04cc7f6152b4f3c95596ec82a54fa8381b95bae19772b"
# Note: npx convex dev connects to the deployment. We need to point it to the value in CONVEX_SELF_HOSTED_URL.
# However, for 'dev' specifically, we might need --url explicitly if CONVEX_DEPLOYMENT is unset.
npx convex dev --once --url "http://127.0.0.1:$CONVEX_ADMIN_PORT" --admin-key "$CONVEX_ADMIN_KEY" || { echo "ERROR: Failed to push to local Convex"; exit 1; }

# Start Stripe Tunnel (NEW)
echo "Checking Stripe CLI tunnel..."
if ! pgrep -x "stripe" > /dev/null; then
    echo "  [START] Starting Stripe CLI tunnel..."
    # We need to get the site URL for the webhook
    CONVEX_SITE_URL=$(npx convex env get CONVEX_SITE_URL 2>/dev/null || echo "")
    if [ -z "$CONVEX_SITE_URL" ]; then
        # Fallback: site URLs usually follow a pattern or we can extract from 'convex dev'
        echo "  [INFO] Getting Convex Site URL..."
        CONVEX_SITE_URL=$(npx convex dev --once | grep "site URL:" | awk '{print $NF}')
    fi

    if [ -n "$CONVEX_SITE_URL" ]; then
        echo "  [OK] Forwarding to: $CONVEX_SITE_URL/stripe/webhook"
        > logs/stripe.log
        stripe listen --forward-to "$CONVEX_SITE_URL/stripe/webhook" 2>&1 | tee logs/stripe.log &
        STRIPE_PID=$!
        echo "  [HINT] Check logs/stripe.log for the 'whsec_...' key if it's new"
    else
        echo "  [ERROR] Could not determine CONVEX_SITE_URL. Skipping Stripe tunnel."
    fi
else
    echo "  [SKIP] Stripe CLI tunnel already active"
fi

# Start Convex watching in background
echo "Starting Convex function watcher..."
> logs/convex.log
npx convex dev --tail-logs always 2>&1 | tee logs/convex.log &
CONVEX_PID=$!
CONVEX_RUNNING=true

echo ""

# Check and start Next.js
echo "Checking Next.js (port $NEXTJS_PORT)..."
if check_port $NEXTJS_PORT; then
    EXISTING_PID=$(get_port_process $NEXTJS_PORT)
    echo "  [SKIP] Next.js already running on port $NEXTJS_PORT (PID: $EXISTING_PID)"
    NEXTJS_RUNNING=true
else
    echo "  [START] Starting Next.js dev server..."
    > logs/nextjs.log
    npm run dev -- -p $NEXTJS_PORT 2>&1 | tee logs/nextjs.log &
    NEXT_PID=$!
    sleep 2
    if check_port $NEXTJS_PORT; then
        echo "  [OK] Next.js started successfully (PID: $NEXT_PID)"
    else
        echo "  [WARN] Next.js may still be starting..."
    fi
fi

echo ""
echo "========================================"

# Summary
if [ "$CONVEX_RUNNING" = true ] && [ "$NEXTJS_RUNNING" = true ]; then
    echo "Both servers were already running."
    echo "Nothing to do - exiting."
    echo ""
    echo "Use --restart or --force to force restart servers."
    exit 0
fi

echo "Logs:"
[ -n "$CONVEX_PID" ] && echo "  - app/logs/convex.log"
[ -n "$NEXT_PID" ] && echo "  - app/logs/nextjs.log"
echo ""
echo "Press Ctrl+C to stop started services"
echo "========================================"

# Handle Ctrl+C to kill only the processes we started
cleanup() {
    echo ""
    echo "Stopping servers..."
    [ -n "$CONVEX_PID" ] && kill $CONVEX_PID 2>/dev/null && echo "  Stopped Convex (PID: $CONVEX_PID)"
    [ -n "$NEXT_PID" ] && kill $NEXT_PID 2>/dev/null && echo "  Stopped Next.js (PID: $NEXT_PID)"
    [ -n "$STRIPE_PID" ] && kill $STRIPE_PID 2>/dev/null && echo "  Stopped Stripe CLI (PID: $STRIPE_PID)"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes we started
if [ -n "$CONVEX_PID" ] || [ -n "$NEXT_PID" ]; then
    wait
else
    echo "No servers started by this script."
fi
