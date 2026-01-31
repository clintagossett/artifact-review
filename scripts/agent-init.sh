#!/bin/bash
# Agent First-Time Initialization Script
#
# This script handles the order of operations for setting up a new agent environment.
# It manages dependencies and race conditions between services.
#
# Flow:
#   Prerequisites → Generate Env → Start Docker → Wait Healthy →
#   Setup Novu → Setup Convex → Start Dev Servers → Smoke Test → Show Status
#
# Usage:
#   ./scripts/agent-init.sh              # Full first-time setup
#   ./scripts/agent-init.sh --check      # Check current state
#   ./scripts/agent-init.sh --env-only   # Only generate env files (no services)
#
# Exit Codes:
#   0 - Success
#   1 - Missing prerequisites
#   2 - Orchestrator not running
#   3 - Docker failed
#   4 - Convex setup failed
#   5 - Novu setup failed
#   6 - Smoke tests failed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"
ORCHESTRATOR_DIR="$(dirname "$PROJECT_ROOT")/artifact-review-orchestrator"
ORCHESTRATOR_CONFIG="$ORCHESTRATOR_DIR/config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✅${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠️${NC}  $1"; }
log_error() { echo -e "${RED}❌${NC} $1"; }
log_step() { echo -e "\n${BLUE}━━━ Phase $1 ━━━${NC}"; }

# =============================================================================
# Source utility libraries
# =============================================================================
source "$SCRIPT_DIR/lib/parse-config.sh"
source "$SCRIPT_DIR/lib/generate-env-docker.sh"
source "$SCRIPT_DIR/lib/generate-env-nextjs.sh"
source "$SCRIPT_DIR/lib/wait-for-healthy.sh"
source "$SCRIPT_DIR/lib/smoke-test.sh"

# =============================================================================
# Backup and Rollback Functions
# =============================================================================

# Create backups before modifying env files
create_env_backups() {
    if [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
        cp "$PROJECT_ROOT/.env.docker.local" "$PROJECT_ROOT/.env.docker.local.backup"
        BACKUPS_CREATED=true
    fi

    if [ -f "$APP_DIR/.env.nextjs.local" ]; then
        cp "$APP_DIR/.env.nextjs.local" "$APP_DIR/.env.nextjs.local.backup"
        BACKUPS_CREATED=true
    fi
}

# Restore env files from backups
rollback_env_files() {
    log_warn "Rolling back changes..."

    if [ -f "$PROJECT_ROOT/.env.docker.local.backup" ]; then
        mv "$PROJECT_ROOT/.env.docker.local.backup" "$PROJECT_ROOT/.env.docker.local"
    fi

    if [ -f "$APP_DIR/.env.nextjs.local.backup" ]; then
        mv "$APP_DIR/.env.nextjs.local.backup" "$APP_DIR/.env.nextjs.local"
    fi
}

# Clean up backups after success
cleanup_env_backups() {
    rm -f "$PROJECT_ROOT/.env.docker.local.backup"
    rm -f "$APP_DIR/.env.nextjs.local.backup"
    BACKUPS_CREATED=false
}

# Signal trap for Ctrl+C (SIGINT), termination (SIGTERM), and errors (ERR)
# Note: ERR trap only fires after setup_env_files() is called (when backups exist)
BACKUPS_CREATED=false

trap_handler() {
    if [ "$BACKUPS_CREATED" = "true" ]; then
        rollback_env_files
    fi
    exit 130
}

trap 'trap_handler' INT TERM

# =============================================================================
# Detect agent name from directory
# =============================================================================
detect_agent_name() {
    local dir_name=$(basename "$PROJECT_ROOT")

    # Extract agent name from artifact-review-{name} pattern
    if [[ "$dir_name" =~ ^artifact-review-(.+)$ ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        echo ""
    fi
}

# =============================================================================
# PHASE 1: Check prerequisites
# =============================================================================
check_prerequisites() {
    log_step "1: Prerequisites"

    local missing=0

    # Check node
    if command -v node &> /dev/null; then
        log_success "Node.js: $(node --version)"
    else
        log_error "Node.js not found"
        missing=1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        log_success "npm: $(npm --version)"
    else
        log_error "npm not found"
        missing=1
    fi

    # Check docker
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            log_success "Docker: running"
        else
            log_error "Docker not running - start Docker first"
            missing=1
        fi
    else
        log_error "Docker not found"
        missing=1
    fi

    # Check tmux
    if command -v tmux &> /dev/null; then
        log_success "tmux: $(tmux -V)"
    else
        log_error "tmux not found"
        missing=1
    fi

    # Check jq (for reading orchestrator config.json)
    if command -v jq &> /dev/null; then
        log_success "jq: $(jq --version)"
    else
        log_error "jq not found (install with: sudo apt install jq)"
        missing=1
    fi

    # Check mkcert (for TLS certificate generation)
    if command -v mkcert &> /dev/null; then
        local mkcert_version=$(mkcert -version 2>&1 || echo "unknown")
        log_success "mkcert: $mkcert_version"
    else
        log_error "mkcert not found"
        log_info "Install mkcert:"
        log_info "  macOS:        brew install mkcert"
        log_info "  Debian/Ubuntu: sudo apt install mkcert"
        log_info "  Other:        https://github.com/FiloSottile/mkcert"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing prerequisites. Please install them first."
        exit 1
    fi
}

# =============================================================================
# PHASE 2: Generate environment files
# =============================================================================
setup_env_files() {
    log_step "2: Configuration"

    # Create backups before modifying any env files
    create_env_backups

    # Auto-detect agent name from directory
    AGENT_NAME=$(detect_agent_name)

    if [ -z "$AGENT_NAME" ]; then
        log_error "Could not detect agent name from directory"
        log_info "Directory should be named: artifact-review-{agent-name}"
        log_info "Current directory: $(basename "$PROJECT_ROOT")"
        exit 1
    fi

    log_success "Detected agent name: $AGENT_NAME"

    # Check orchestrator config exists
    if [ ! -f "$ORCHESTRATOR_CONFIG" ]; then
        log_error "Orchestrator config not found at $ORCHESTRATOR_CONFIG"
        log_info "Make sure artifact-review-orchestrator is set up first"
        exit 1
    fi

    # Generate .env.docker.local using library (always regenerate)
    if [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
        log_info "Regenerating .env.docker.local..."
    else
        log_info "Generating .env.docker.local..."
    fi

    generate_env_docker "$AGENT_NAME" "$PROJECT_ROOT/.env.docker.local"
    log_success "Generated .env.docker.local"

    # Load the generated config
    source "$PROJECT_ROOT/.env.docker.local"

    # Copy .env.dev.local if it doesn't exist
    cd "$PROJECT_ROOT"
    if [ ! -f ".env.dev.local" ] && [ -f ".env.dev.local.example" ]; then
        cp .env.dev.local.example .env.dev.local
        log_success "Created .env.dev.local (add your dev API keys later)"
    elif [ -f ".env.dev.local" ]; then
        log_success ".env.dev.local exists"
    fi

    # Generate app/.env.nextjs.local using library
    cd "$APP_DIR"
    if [ ! -f ".env.nextjs.local" ]; then
        log_info "Generating app/.env.nextjs.local..."
        generate_env_nextjs "$AGENT_NAME" "$APP_DIR/.env.nextjs.local"
        log_success "Created app/.env.nextjs.local (secrets will be populated by setup scripts)"
    elif [ -f ".env.nextjs.local" ]; then
        log_success "app/.env.nextjs.local exists"
    fi

    # Copy .env.convex.local if it doesn't exist
    if [ ! -f ".env.convex.local" ] && [ -f ".env.convex.local.example" ]; then
        cp .env.convex.local.example .env.convex.local
        log_success "Created app/.env.convex.local (will be populated by setup scripts)"
    elif [ -f ".env.convex.local" ]; then
        log_success "app/.env.convex.local exists"
    fi

    cd "$PROJECT_ROOT"
}

# =============================================================================
# PHASE 3: Verify Infrastructure
# =============================================================================
verify_orchestrator() {
    log_step "3: Infrastructure"

    # Check if orchestrator proxy is running
    if curl -s -o /dev/null -w "%{http_code}" https://novu.loc/ 2>/dev/null | grep -q "200\|302"; then
        log_success "Orchestrator proxy running"
    else
        log_warn "Orchestrator not responding"
        log_info "Starting orchestrator..."

        if [ -d "$ORCHESTRATOR_DIR" ]; then
            cd "$ORCHESTRATOR_DIR"
            ./start.sh
            cd "$PROJECT_ROOT"

            # Wait for it to be ready
            sleep 3

            if curl -s -o /dev/null https://novu.loc/ 2>/dev/null; then
                log_success "Orchestrator started"
            else
                log_error "Failed to start orchestrator"
                rollback_env_files
                exit 2
            fi
        else
            log_error "Orchestrator not found at $ORCHESTRATOR_DIR"
            log_info "Please start it manually: cd ../artifact-review-orchestrator && ./start.sh"
            rollback_env_files
            exit 2
        fi
    fi

    # Check Novu is accessible
    if curl -s -o /dev/null -w "%{http_code}" https://api.novu.loc/v1/health 2>/dev/null | grep -q "200"; then
        log_success "Novu API healthy"
    else
        log_warn "Novu API not responding (may need a moment to start)"
    fi
}

# =============================================================================
# PHASE 4: Install Dependencies
# =============================================================================
install_dependencies() {
    cd "$APP_DIR"

    if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
        log_success "node_modules exists"
        log_info "Run 'npm install' manually if you need to update dependencies"
    else
        log_info "Installing npm dependencies..."
        # Use --legacy-peer-deps to handle peer dependency conflicts
        npm install --legacy-peer-deps
        log_success "Dependencies installed"
    fi

    cd "$PROJECT_ROOT"
}

# =============================================================================
# PHASE 5: Start Docker Services
# =============================================================================
start_convex_container() {
    log_step "4: Docker Services"

    source "$PROJECT_ROOT/.env.docker.local"

    # Check if Convex container is running
    if docker ps --format '{{.Names}}' | grep -q "^${AGENT_NAME}-backend$"; then
        log_success "Convex container running: ${AGENT_NAME}-backend"
    else
        log_info "Starting Convex container..."

        cd "$PROJECT_ROOT"

        # Export all env vars from .env.docker.local for docker compose
        set -a
        source "$PROJECT_ROOT/.env.docker.local"
        set +a
        export COMPOSE_PROJECT_NAME="$AGENT_NAME"

        # Use --env-file to override the default .env file
        if ! docker compose --env-file "$PROJECT_ROOT/.env.docker.local" up -d; then
            log_error "Failed to start Docker containers"
            rollback_env_files
            exit 3
        fi

        log_info "Waiting for Convex to initialize..."

        # Use wait-for-healthy library
        if ! wait_for_container_healthy "${AGENT_NAME}-backend" 60; then
            log_error "Convex container failed to become healthy"
            rollback_env_files
            exit 3
        fi

        log_success "Convex container started and healthy"
    fi
}

# =============================================================================
# PHASE 6: Configure Services
# =============================================================================
setup_novu() {
    log_step "5: Service Configuration - Novu"

    source "$PROJECT_ROOT/.env.docker.local"
    cd "$PROJECT_ROOT"

    if [ -x "./scripts/setup-novu-org.sh" ]; then
        log_info "Setting up Novu organization for $AGENT_NAME..."
        if ! ./scripts/setup-novu-org.sh; then
            log_error "Novu setup failed"
            rollback_env_files
            exit 5
        fi
        log_success "Novu organization configured"
    else
        log_warn "setup-novu-org.sh not found or not executable"
    fi
}

configure_convex_env() {
    log_step "6: Service Configuration - Convex"

    # Run setup-convex-env.sh to get admin key and configure
    # This runs AFTER Novu setup so NOVU_* vars are available
    log_info "Configuring Convex environment (including Novu keys)..."
    cd "$PROJECT_ROOT"

    if [ -x "./scripts/setup-convex-env.sh" ]; then
        if ! ./scripts/setup-convex-env.sh; then
            log_error "Convex setup failed"
            rollback_env_files
            exit 4
        fi
        log_success "Convex environment configured"
    else
        log_warn "setup-convex-env.sh not found or not executable"
    fi
}

# =============================================================================
# PHASE 7: Start Dev Servers
# =============================================================================
start_dev_servers() {
    log_step "7: Dev Servers"

    cd "$PROJECT_ROOT"

    log_info "Starting development servers..."
    if [ -x "./scripts/start-dev-servers.sh" ]; then
        ./scripts/start-dev-servers.sh
        log_success "Dev servers started"
    else
        log_warn "start-dev-servers.sh not found or not executable"
    fi
}

# =============================================================================
# PHASE 8: Validate Setup (Smoke Tests)
# =============================================================================
validate_setup() {
    log_step "8: Validation"

    cd "$PROJECT_ROOT"

    # Run smoke tests using library function (this will return 0 on success, 1 on failure)
    if run_smoke_tests "$PROJECT_ROOT"; then
        log_success "All smoke tests passed!"
    else
        log_error "Smoke tests failed. See output above for details."
        rollback_env_files
        exit 6
    fi
}

# =============================================================================
# PHASE 9: Final Status
# =============================================================================
show_status() {
    log_step "9: Setup Complete"

    # Clean up backup files on success
    cleanup_env_backups

    source "$PROJECT_ROOT/.env.docker.local"

    echo ""
    echo "Agent: $AGENT_NAME"
    echo ""
    echo "URLs:"
    echo "  App:      https://${AGENT_NAME}.loc"
    echo "  Convex:   https://${AGENT_NAME}.convex.cloud.loc"
    echo "  Mailpit:  https://${AGENT_NAME}.mailpit.loc"
    echo "  Novu:     https://novu.loc"
    echo ""
    echo "Dev servers are running in tmux sessions:"
    echo "  tmux attach -t ${AGENT_NAME}-nextjs"
    echo "  tmux attach -t ${AGENT_NAME}-convex-dev"
    echo ""
}

# =============================================================================
# Check mode - Enhanced with multi-source display and port comparison
# =============================================================================
check_status() {
    # Disable exit on error for check mode (we want to continue even if things fail)
    set +e

    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          Agent Configuration Status                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # Track issues for summary
    local issue_count=0
    local -a issues

    # Detect agent name
    local detected_name=$(detect_agent_name)

    # =========================================================================
    # Section 1: Configuration Sources
    # =========================================================================
    echo "━━━ Configuration Sources ━━━"
    echo ""

    # --- config.json ---
    # Initialize config variables with defaults (used later in port comparison)
    local config_app_port=""
    local config_convex_port=""
    local config_convex_site_port=""
    local config_mailpit_port=""
    local config_subnet=""

    if [ -f "$ORCHESTRATOR_CONFIG" ]; then
        echo "config.json: $ORCHESTRATOR_CONFIG"

        # Validate JSON
        if jq empty "$ORCHESTRATOR_CONFIG" 2>/dev/null; then
            # Check if agent exists
            if [ -n "$detected_name" ] && validate_agent_exists "$detected_name" 2>/dev/null; then
                config_app_port=$(get_agent_port "$detected_name" "appPort" 2>/dev/null || echo "N/A")
                config_convex_port=$(get_agent_port "$detected_name" "convexCloudPort" 2>/dev/null || echo "N/A")
                config_convex_site_port=$(get_agent_port "$detected_name" "convexSitePort" 2>/dev/null || echo "N/A")
                config_mailpit_port=$(get_agent_port "$detected_name" "mailpitPort" 2>/dev/null || echo "N/A")
                config_subnet=$(get_agent_port "$detected_name" "subnet" 2>/dev/null || echo "N/A")

                log_success "  Agent: $detected_name"
                log_success "  appPort: $config_app_port"
                log_success "  convexCloudPort: $config_convex_port"
                log_success "  convexSitePort: $config_convex_site_port"
                log_success "  mailpitPort: $config_mailpit_port"
                log_success "  subnet: $config_subnet"
            else
                log_warn "  Agent '$detected_name' not found in config"
                issues+=("Agent not found in orchestrator config.json")
                issue_count=$((issue_count + 1))
            fi
        else
            log_warn "  Invalid JSON in config.json"
            issues+=("config.json contains invalid JSON")
            issue_count=$((issue_count + 1))
        fi
    else
        log_warn "  config.json not found at $ORCHESTRATOR_CONFIG"
        issues+=("Orchestrator config.json not found")
        issue_count=$((issue_count + 1))
    fi
    echo ""

    # --- .env.docker.local ---
    if [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
        echo ".env.docker.local: $PROJECT_ROOT/.env.docker.local"
        source "$PROJECT_ROOT/.env.docker.local" 2>/dev/null || true

        if [ -n "${AGENT_NAME:-}" ]; then
            log_success "  AGENT_NAME: $AGENT_NAME"
        else
            log_warn "  AGENT_NAME: NOT SET"
        fi

        if [ -n "${BASE_PORT:-}" ]; then
            log_success "  BASE_PORT: $BASE_PORT"
        else
            log_warn "  BASE_PORT: NOT SET"
        fi

        if [ -n "${SUBNET:-}" ]; then
            log_success "  SUBNET: $SUBNET"
        else
            log_warn "  SUBNET: NOT SET"
        fi
    else
        log_warn ".env.docker.local: not found (run agent-init.sh to generate)"
        issues+=(".env.docker.local missing")
        issue_count=$((issue_count + 1))
    fi
    echo ""

    # --- app/.env.nextjs.local ---
    if [ -f "$APP_DIR/.env.nextjs.local" ]; then
        echo "app/.env.nextjs.local: $APP_DIR/.env.nextjs.local"

        # Parse env vars from file
        local convex_url=$(grep "^CONVEX_SELF_HOSTED_URL=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2-)
        local node_ca=$(grep "^NODE_EXTRA_CA_CERTS=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2-)
        local novu_key=$(grep "^NOVU_API_KEY=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2-)
        local novu_app_id=$(grep "^NOVU_APPLICATION_IDENTIFIER=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2-)

        [ -n "$convex_url" ] && log_success "  CONVEX_SELF_HOSTED_URL: $convex_url" || log_warn "  CONVEX_SELF_HOSTED_URL: NOT SET"
        [ -n "$node_ca" ] && log_success "  NODE_EXTRA_CA_CERTS: $node_ca" || log_warn "  NODE_EXTRA_CA_CERTS: NOT SET"
        [ -n "$novu_key" ] && log_success "  NOVU_API_KEY: ${novu_key:0:20}..." || log_warn "  NOVU_API_KEY: NOT SET"
        [ -n "$novu_app_id" ] && log_success "  NOVU_APPLICATION_IDENTIFIER: $novu_app_id" || log_warn "  NOVU_APPLICATION_IDENTIFIER: NOT SET"
    else
        log_warn "app/.env.nextjs.local: not found"
        issues+=("app/.env.nextjs.local missing")
        issue_count=$((issue_count + 1))
    fi
    echo ""

    # =========================================================================
    # Section 2: Port Comparison
    # =========================================================================
    echo "━━━ Port Comparison ━━━"
    echo ""

    # Compare config.json vs .env.docker.local
    if [ -f "$ORCHESTRATOR_CONFIG" ] && [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
        printf "%-20s %-15s %-12s %-12s %s\n" "Setting" "Source" "Expected" "Actual" "Status"
        printf "%-20s %-15s %-12s %-12s %s\n" "──────────────────" "─────────────" "──────────" "──────────" "──────"

        # Compare BASE_PORT vs appPort
        if [ -n "$config_app_port" ] && [ -n "${BASE_PORT:-}" ]; then
            if [ "$config_app_port" = "$BASE_PORT" ]; then
                printf "%-20s %-15s %-12s %-12s %s\n" "appPort" "config.json" "$config_app_port" "$BASE_PORT" "✓"
            else
                printf "%-20s %-15s %-12s %-12s %s\n" "appPort" "config.json" "$config_app_port" "$BASE_PORT" "⚠️ MISMATCH"
                issues+=("Port mismatch: config.json appPort=$config_app_port, .env BASE_PORT=$BASE_PORT")
                issue_count=$((issue_count + 1))
            fi
        fi

        # Compare subnet
        if [ -n "$config_subnet" ] && [ -n "${SUBNET:-}" ]; then
            # Extract just the subnet prefix (172.28) from SUBNET (172.28.0.0/24)
            local subnet_prefix=$(echo "$SUBNET" | cut -d. -f1-2)
            if [ "$config_subnet" = "$subnet_prefix" ]; then
                printf "%-20s %-15s %-12s %-12s %s\n" "subnet" "config.json" "$config_subnet" "$subnet_prefix" "✓"
            else
                printf "%-20s %-15s %-12s %-12s %s\n" "subnet" "config.json" "$config_subnet" "$subnet_prefix" "⚠️ MISMATCH"
                issues+=("Subnet mismatch: config.json=$config_subnet, .env=$subnet_prefix")
                issue_count=$((issue_count + 1))
            fi
        fi
    fi
    echo ""

    # =========================================================================
    # Section 3: Required Variables
    # =========================================================================
    echo "━━━ Required Variables ━━━"
    echo ""

    # Check .env.docker.local required vars
    [ -n "${AGENT_NAME:-}" ] && log_success "  AGENT_NAME (from .env.docker.local)" || { log_warn "  AGENT_NAME: NOT SET (required)"; issues+=("AGENT_NAME not set"); issue_count=$((issue_count + 1)); }
    [ -n "${BASE_PORT:-}" ] && log_success "  BASE_PORT (from .env.docker.local)" || { log_warn "  BASE_PORT: NOT SET (required)"; issues+=("BASE_PORT not set"); issue_count=$((issue_count + 1)); }
    [ -n "${SUBNET:-}" ] && log_success "  SUBNET (from .env.docker.local)" || { log_warn "  SUBNET: NOT SET (required)"; issues+=("SUBNET not set"); issue_count=$((issue_count + 1)); }

    # Check app/.env.nextjs.local required vars
    if [ -f "$APP_DIR/.env.nextjs.local" ]; then
        local convex_url=$(grep "^CONVEX_SELF_HOSTED_URL=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2-)
        local node_ca=$(grep "^NODE_EXTRA_CA_CERTS=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2-)
        local novu_key=$(grep "^NOVU_API_KEY=" "$APP_DIR/.env.nextjs.local" 2>/dev/null | cut -d= -f2-)

        [ -n "$convex_url" ] && log_success "  CONVEX_SELF_HOSTED_URL (from app/.env.nextjs.local)" || { log_warn "  CONVEX_SELF_HOSTED_URL: NOT SET (required)"; issues+=("CONVEX_SELF_HOSTED_URL missing"); issue_count=$((issue_count + 1)); }
        [ -n "$node_ca" ] && log_success "  NODE_EXTRA_CA_CERTS (from app/.env.nextjs.local)" || { log_warn "  NODE_EXTRA_CA_CERTS: NOT SET (required)"; issues+=("NODE_EXTRA_CA_CERTS missing"); issue_count=$((issue_count + 1)); }
        [ -n "$novu_key" ] && log_success "  NOVU_API_KEY (from app/.env.nextjs.local)" || { log_warn "  NOVU_API_KEY: NOT SET (required)"; issues+=("NOVU_API_KEY missing"); issue_count=$((issue_count + 1)); }
    fi
    echo ""

    # =========================================================================
    # Section 4: Service Status
    # =========================================================================
    echo "━━━ Service Status ━━━"
    echo ""

    # Check orchestrator
    if curl -s -o /dev/null https://novu.loc/ 2>/dev/null; then
        log_success "  Orchestrator running"
    else
        log_warn "  Orchestrator not running"
    fi

    # Check Docker
    if [ -n "${AGENT_NAME:-}" ] && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${AGENT_NAME}-backend$"; then
        log_success "  Convex container running (${AGENT_NAME}-backend)"
    else
        log_warn "  Convex container not running"
    fi

    # Check tmux sessions
    if [ -n "${AGENT_NAME:-}" ]; then
        tmux has-session -t "${AGENT_NAME}-nextjs" 2>/dev/null && log_success "  tmux: ${AGENT_NAME}-nextjs" || log_warn "  tmux: ${AGENT_NAME}-nextjs not running"
        tmux has-session -t "${AGENT_NAME}-convex-dev" 2>/dev/null && log_success "  tmux: ${AGENT_NAME}-convex-dev" || log_warn "  tmux: ${AGENT_NAME}-convex-dev not running"
    fi
    echo ""

    # =========================================================================
    # Section 5: Summary
    # =========================================================================
    echo "━━━ Summary ━━━"
    echo ""

    if [ $issue_count -eq 0 ]; then
        log_success "Configuration Status: ✓ ALL VALID"
        echo ""
        echo "All configuration sources are consistent and required variables are set."
    else
        log_warn "Configuration Status: ⚠️ WARNINGS ($issue_count issue(s) found)"
        echo ""
        echo "Issues:"
        for i in "${!issues[@]}"; do
            echo "  $((i + 1)). ${issues[$i]}"
        done
        echo ""
        echo "Recommendations:"
        echo "  • Run ./scripts/agent-init.sh to regenerate env files"
        echo "  • Run ./scripts/setup-novu-org.sh to configure Novu keys"
    fi
    echo ""

    # Always return 0 (check mode is informational only)
    return 0
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          Agent First-Time Initialization                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    cd "$PROJECT_ROOT"

    case "${1:-}" in
        --check)
            check_status
            ;;
        --env-only)
            check_prerequisites
            setup_env_files
            log_success "Environment files ready. Run without --env-only for full setup."
            ;;
        *)
            check_prerequisites
            setup_env_files
            verify_orchestrator
            install_dependencies
            start_convex_container
            setup_novu
            configure_convex_env
            start_dev_servers
            validate_setup
            show_status
            ;;
    esac
}

main "$@"
