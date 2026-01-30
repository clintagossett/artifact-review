#!/bin/bash
# Agent First-Time Initialization Script
#
# This script handles the order of operations for setting up a new agent environment.
# It manages dependencies and race conditions between services.
#
# Usage:
#   ./scripts/agent-init.sh              # Full first-time setup
#   ./scripts/agent-init.sh --check      # Check current state
#   ./scripts/agent-init.sh --env-only   # Only copy env files (no services)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"
ORCHESTRATOR_DIR="$(dirname "$PROJECT_ROOT")/artifact-review-orchestrator"

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
log_step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# =============================================================================
# STEP 0: Check prerequisites
# =============================================================================
check_prerequisites() {
    log_step "Checking Prerequisites"

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

    if [ $missing -eq 1 ]; then
        log_error "Missing prerequisites. Please install them first."
        exit 1
    fi
}

# =============================================================================
# STEP 1: Environment Files
# =============================================================================
setup_env_files() {
    log_step "Step 1: Environment Files"

    # Check for .env.docker.local (agent identity)
    if [ ! -f "$PROJECT_ROOT/.env.docker.local" ]; then
        if [ -f "$PROJECT_ROOT/.env.docker.local.example" ]; then
            log_warn ".env.docker.local not found"
            log_info "Please create it with your AGENT_NAME:"
            echo ""
            echo "  cp .env.docker.local.example .env.docker.local"
            echo "  # Edit .env.docker.local and set AGENT_NAME=your-name"
            echo ""
            exit 1
        else
            log_error ".env.docker.local.example not found!"
            exit 1
        fi
    fi

    # Load agent identity
    source "$PROJECT_ROOT/.env.docker.local"

    if [ -z "$AGENT_NAME" ]; then
        log_error "AGENT_NAME not set in .env.docker.local"
        exit 1
    fi

    log_success "Agent identity: $AGENT_NAME"

    # Copy other env files if they don't exist
    cd "$PROJECT_ROOT"

    if [ ! -f ".env.dev.local" ] && [ -f ".env.dev.local.example" ]; then
        cp .env.dev.local.example .env.dev.local
        log_success "Created .env.dev.local (add your dev API keys later)"
    elif [ -f ".env.dev.local" ]; then
        log_success ".env.dev.local exists"
    fi

    cd "$APP_DIR"

    if [ ! -f ".env.nextjs.local" ] && [ -f ".env.nextjs.local.example" ]; then
        # Substitute AGENT_NAME in the example
        sed "s/\${AGENT_NAME}/$AGENT_NAME/g" .env.nextjs.local.example > .env.nextjs.local
        log_success "Created app/.env.nextjs.local (secrets will be populated by setup scripts)"
    elif [ -f ".env.nextjs.local" ]; then
        log_success "app/.env.nextjs.local exists"
    fi

    if [ ! -f ".env.convex.local" ] && [ -f ".env.convex.local.example" ]; then
        cp .env.convex.local.example .env.convex.local
        log_success "Created app/.env.convex.local (will be populated by setup scripts)"
    elif [ -f ".env.convex.local" ]; then
        log_success "app/.env.convex.local exists"
    fi

    cd "$PROJECT_ROOT"
}

# =============================================================================
# STEP 2: Verify Orchestrator
# =============================================================================
verify_orchestrator() {
    log_step "Step 2: Verify Orchestrator"

    # Check if orchestrator proxy is running
    if curl -s -o /dev/null -w "%{http_code}" http://novu.loc/ 2>/dev/null | grep -q "200\|302"; then
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

            if curl -s -o /dev/null http://novu.loc/ 2>/dev/null; then
                log_success "Orchestrator started"
            else
                log_error "Failed to start orchestrator"
                exit 1
            fi
        else
            log_error "Orchestrator not found at $ORCHESTRATOR_DIR"
            log_info "Please start it manually: cd ../artifact-review-orchestrator && ./start.sh"
            exit 1
        fi
    fi

    # Check Novu is accessible
    if curl -s -o /dev/null -w "%{http_code}" http://api.novu.loc/v1/health 2>/dev/null | grep -q "200"; then
        log_success "Novu API healthy"
    else
        log_warn "Novu API not responding (may need a moment to start)"
    fi
}

# =============================================================================
# STEP 3: Install Dependencies
# =============================================================================
install_dependencies() {
    log_step "Step 3: Install Dependencies"

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
# STEP 4: Setup Convex (Docker + Admin Key)
# =============================================================================
setup_convex() {
    log_step "Step 4: Setup Convex"

    source "$PROJECT_ROOT/.env.docker.local"

    # Check if Convex container is running
    if docker ps --format '{{.Names}}' | grep -q "^${AGENT_NAME}-backend$"; then
        log_success "Convex container running: ${AGENT_NAME}-backend"
    else
        log_info "Starting Convex container..."
        # The start-dev-servers.sh handles Docker startup
        # But we need to do initial Docker setup first

        cd "$PROJECT_ROOT"

        # Export all env vars from .env.docker.local for docker compose
        set -a
        source "$PROJECT_ROOT/.env.docker.local"
        set +a
        export COMPOSE_PROJECT_NAME="$AGENT_NAME"

        # Use --env-file to override the default .env file
        docker compose --env-file "$PROJECT_ROOT/.env.docker.local" up -d

        log_info "Waiting for Convex to initialize..."
        sleep 10

        if docker ps --format '{{.Names}}' | grep -q "^${AGENT_NAME}-backend$"; then
            log_success "Convex container started"
        else
            log_error "Failed to start Convex container"
            exit 1
        fi
    fi

    # Run setup-convex-env.sh to get admin key and configure
    log_info "Configuring Convex environment..."
    cd "$PROJECT_ROOT"

    if [ -x "./scripts/setup-convex-env.sh" ]; then
        ./scripts/setup-convex-env.sh
        log_success "Convex environment configured"
    else
        log_warn "setup-convex-env.sh not found or not executable"
    fi
}

# =============================================================================
# STEP 5: Setup Novu Organization
# =============================================================================
setup_novu() {
    log_step "Step 5: Setup Novu Organization"

    source "$PROJECT_ROOT/.env.docker.local"

    cd "$PROJECT_ROOT"

    if [ -x "./scripts/setup-novu-org.sh" ]; then
        log_info "Setting up Novu organization for $AGENT_NAME..."
        ./scripts/setup-novu-org.sh
        log_success "Novu organization configured"
    else
        log_warn "setup-novu-org.sh not found or not executable"
    fi
}

# =============================================================================
# STEP 6: Final Status
# =============================================================================
show_status() {
    log_step "Setup Complete"

    source "$PROJECT_ROOT/.env.docker.local"

    echo ""
    echo "Agent: $AGENT_NAME"
    echo ""
    echo "URLs:"
    echo "  App:      http://${AGENT_NAME}.loc"
    echo "  Convex:   http://${AGENT_NAME}.convex.cloud.loc"
    echo "  Mailpit:  http://${AGENT_NAME}.mailpit.loc"
    echo "  Novu:     http://novu.loc"
    echo ""
    echo "Next steps:"
    echo "  1. Start dev servers:  ./scripts/start-dev-servers.sh"
    echo "  2. View app:           http://${AGENT_NAME}.loc"
    echo ""
    echo "Tmux sessions (after starting):"
    echo "  tmux attach -t ${AGENT_NAME}-nextjs"
    echo "  tmux attach -t ${AGENT_NAME}-convex-dev"
    echo ""
}

# =============================================================================
# Check mode
# =============================================================================
check_status() {
    log_step "Checking Agent Status"

    if [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
        source "$PROJECT_ROOT/.env.docker.local"
        log_success "Agent identity: ${AGENT_NAME:-NOT SET}"
    else
        log_warn ".env.docker.local not found"
    fi

    # Check env files
    [ -f "$PROJECT_ROOT/.env.dev.local" ] && log_success ".env.dev.local exists" || log_warn ".env.dev.local missing"
    [ -f "$APP_DIR/.env.nextjs.local" ] && log_success "app/.env.nextjs.local exists" || log_warn "app/.env.nextjs.local missing"
    [ -f "$APP_DIR/.env.convex.local" ] && log_success "app/.env.convex.local exists" || log_warn "app/.env.convex.local missing"

    # Check orchestrator
    if curl -s -o /dev/null http://novu.loc/ 2>/dev/null; then
        log_success "Orchestrator running"
    else
        log_warn "Orchestrator not running"
    fi

    # Check Docker
    if [ -n "$AGENT_NAME" ] && docker ps --format '{{.Names}}' | grep -q "^${AGENT_NAME}-backend$"; then
        log_success "Convex container running"
    else
        log_warn "Convex container not running"
    fi

    # Check tmux sessions
    if [ -n "$AGENT_NAME" ]; then
        tmux has-session -t "${AGENT_NAME}-nextjs" 2>/dev/null && log_success "tmux: ${AGENT_NAME}-nextjs" || log_warn "tmux: ${AGENT_NAME}-nextjs not running"
        tmux has-session -t "${AGENT_NAME}-convex-dev" 2>/dev/null && log_success "tmux: ${AGENT_NAME}-convex-dev" || log_warn "tmux: ${AGENT_NAME}-convex-dev not running"
    fi
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
            setup_env_files
            log_success "Environment files ready. Run without --env-only for full setup."
            ;;
        *)
            check_prerequisites
            setup_env_files
            verify_orchestrator
            install_dependencies
            setup_convex
            setup_novu
            show_status
            ;;
    esac
}

main "$@"
