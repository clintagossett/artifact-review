#!/bin/bash
# Agent Environment Teardown Script
#
# This script provides a clean teardown of the agent environment for a fresh start.
# It is the "nuclear option" - use --sync-secrets for non-disruptive updates.
#
# WARNING: This will destroy local Convex data, JWT keys, and sessions.
# All existing user sessions will be invalidated.
#
# Usage:
#   ./scripts/agent-teardown.sh              # Interactive with confirmation
#   ./scripts/agent-teardown.sh --dry-run    # Show what would be deleted
#   ./scripts/agent-teardown.sh --yes        # Skip confirmation (CI/automation)
#   ./scripts/agent-teardown.sh --keep-deps  # Keep node_modules

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"

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
log_dry() { echo -e "${YELLOW}[DRY-RUN]${NC} $1"; }

# Parse arguments
DRY_RUN=false
SKIP_CONFIRM=false
KEEP_DEPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --yes|-y)
            SKIP_CONFIRM=true
            shift
            ;;
        --keep-deps)
            KEEP_DEPS=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./scripts/agent-teardown.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would be deleted without making changes"
            echo "  --yes, -y    Skip confirmation prompt (for CI/automation)"
            echo "  --keep-deps  Keep node_modules directory"
            echo "  --help, -h   Show this help message"
            echo ""
            echo "This script tears down the agent environment for a fresh start."
            echo "Use './scripts/agent-init.sh --sync-secrets' for non-disruptive updates."
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Detect agent name from directory or .env.docker.local
# =============================================================================
detect_agent_name() {
    # Try .env.docker.local first
    if [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
        local name=$(grep "^AGENT_NAME=" "$PROJECT_ROOT/.env.docker.local" | cut -d= -f2-)
        if [ -n "$name" ]; then
            echo "$name"
            return
        fi
    fi

    # Fall back to directory name detection
    local dir_name=$(basename "$PROJECT_ROOT")
    if [[ "$dir_name" =~ ^artifact-review-(.+)$ ]]; then
        echo "${BASH_REMATCH[1]}"
    fi
}

# =============================================================================
# Create backup of env files
# =============================================================================
backup_env_files() {
    local backup_dir="/tmp/agent-teardown-backup-$(date +%Y%m%d-%H%M%S)"

    if [ "$DRY_RUN" = true ]; then
        log_dry "Would create backup at: $backup_dir"
        return 0
    fi

    mkdir -p "$backup_dir"

    local backed_up=0
    for file in ".env.docker.local" ".env.dev.local" ".envrc"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            cp "$PROJECT_ROOT/$file" "$backup_dir/"
            backed_up=$((backed_up + 1))
        fi
    done

    for file in ".env.nextjs.local" ".env.convex.local"; do
        if [ -f "$APP_DIR/$file" ]; then
            cp "$APP_DIR/$file" "$backup_dir/"
            backed_up=$((backed_up + 1))
        fi
    done

    if [ $backed_up -gt 0 ]; then
        log_success "Backed up $backed_up env file(s) to: $backup_dir"
        echo "$backup_dir"
    fi
}

# =============================================================================
# Stop tmux sessions
# =============================================================================
stop_tmux_sessions() {
    local agent_name="$1"

    log_step "Stopping tmux Sessions"

    local sessions=("${agent_name}-nextjs" "${agent_name}-convex-dev" "${agent_name}-stripe")
    local stopped=0

    for session in "${sessions[@]}"; do
        if tmux has-session -t "$session" 2>/dev/null; then
            if [ "$DRY_RUN" = true ]; then
                log_dry "Would kill tmux session: $session"
            else
                tmux kill-session -t "$session" 2>/dev/null || true
                log_success "Stopped tmux session: $session"
            fi
            stopped=$((stopped + 1))
        else
            log_info "tmux session not running: $session"
        fi
    done

    if [ $stopped -eq 0 ]; then
        log_info "No tmux sessions to stop"
    fi
}

# =============================================================================
# Stop Docker containers
# =============================================================================
stop_docker_containers() {
    local agent_name="$1"

    log_step "Stopping Docker Containers"

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_warn "Docker is not running"
        return 0
    fi

    # Export required env vars for docker compose
    export AGENT_NAME="$agent_name"
    export COMPOSE_PROJECT_NAME="$agent_name"

    # Source .env.docker.local if it exists for other vars
    if [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
        set -a
        source "$PROJECT_ROOT/.env.docker.local"
        set +a
    fi

    cd "$PROJECT_ROOT"

    # Check if any containers exist for this project
    local containers=$(docker compose ps -q 2>/dev/null || true)
    if [ -z "$containers" ]; then
        log_info "No Docker containers running for $agent_name"
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        log_dry "Would run: docker compose down"
        log_dry "Containers that would be stopped:"
        docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || true
    else
        docker compose down 2>/dev/null || true
        log_success "Stopped Docker containers"
    fi
}

# =============================================================================
# Remove Docker volumes (THE DESTRUCTIVE PART)
# =============================================================================
remove_docker_volumes() {
    local agent_name="$1"

    log_step "Removing Docker Volumes"

    local volume_name="${agent_name}_convex_data"

    if ! docker volume ls --format '{{.Name}}' | grep -q "^${volume_name}$"; then
        log_info "Volume $volume_name does not exist"
        return 0
    fi

    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  WARNING: DESTRUCTIVE ACTION                              ║${NC}"
    echo -e "${RED}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${RED}║  This will permanently delete:                            ║${NC}"
    echo -e "${RED}║  • JWT signing keys (all sessions invalidated)            ║${NC}"
    echo -e "${RED}║  • Convex database (all local data lost)                  ║${NC}"
    echo -e "${RED}║  • Admin authentication credentials                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_dry "Would remove Docker volume: $volume_name"
        return 0
    fi

    docker volume rm "$volume_name" 2>/dev/null || true
    log_success "Removed Docker volume: $volume_name"
}

# =============================================================================
# Remove generated env files
# =============================================================================
remove_env_files() {
    log_step "Removing Generated Environment Files"

    local removed=0

    # Root level env files
    for file in ".env.docker.local" ".envrc"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            if [ "$DRY_RUN" = true ]; then
                log_dry "Would remove: $file"
            else
                rm "$PROJECT_ROOT/$file"
                log_success "Removed: $file"
            fi
            removed=$((removed + 1))
        fi
    done

    # App level env files
    for file in ".env.nextjs.local" ".env.convex.local"; do
        if [ -f "$APP_DIR/$file" ]; then
            if [ "$DRY_RUN" = true ]; then
                log_dry "Would remove: app/$file"
            else
                rm "$APP_DIR/$file"
                log_success "Removed: app/$file"
            fi
            removed=$((removed + 1))
        fi
    done

    # Note: We intentionally do NOT remove .env.dev.local as it may contain
    # user-specific API keys that aren't in the shared parent

    if [ $removed -eq 0 ]; then
        log_info "No env files to remove"
    fi
}

# =============================================================================
# Remove node_modules (optional)
# =============================================================================
remove_node_modules() {
    log_step "Removing node_modules"

    if [ "$KEEP_DEPS" = true ]; then
        log_info "Keeping node_modules (--keep-deps flag)"
        return 0
    fi

    if [ -d "$APP_DIR/node_modules" ]; then
        if [ "$DRY_RUN" = true ]; then
            local size=$(du -sh "$APP_DIR/node_modules" 2>/dev/null | cut -f1)
            log_dry "Would remove: app/node_modules ($size)"
        else
            rm -rf "$APP_DIR/node_modules"
            log_success "Removed: app/node_modules"
        fi
    else
        log_info "node_modules does not exist"
    fi
}

# =============================================================================
# Show summary
# =============================================================================
show_summary() {
    local backup_dir="$1"

    log_step "Teardown Complete"

    if [ "$DRY_RUN" = true ]; then
        echo ""
        echo "This was a dry run. No changes were made."
        echo "Run without --dry-run to perform the teardown."
    else
        echo ""
        echo "Environment has been torn down."
        if [ -n "$backup_dir" ]; then
            echo ""
            echo "Env files backed up to: $backup_dir"
        fi
        echo ""
        echo "To reinitialize, run:"
        echo "  ./scripts/agent-init.sh"
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          Agent Environment Teardown                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    cd "$PROJECT_ROOT"

    # Detect agent name
    local agent_name=$(detect_agent_name)
    if [ -z "$agent_name" ]; then
        log_error "Could not detect agent name"
        log_info "Make sure you're in an artifact-review-{name} directory"
        exit 1
    fi

    log_info "Agent: $agent_name"

    if [ "$DRY_RUN" = true ]; then
        echo ""
        log_warn "DRY RUN MODE - No changes will be made"
    fi

    # Confirmation prompt
    if [ "$DRY_RUN" = false ] && [ "$SKIP_CONFIRM" = false ]; then
        echo ""
        echo -e "${YELLOW}This will destroy your local environment including:${NC}"
        echo "  • Convex database and JWT keys"
        echo "  • All user sessions"
        echo "  • Generated environment files"
        if [ "$KEEP_DEPS" = false ]; then
            echo "  • node_modules"
        fi
        echo ""
        read -p "Are you sure you want to continue? [y/N] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Teardown cancelled"
            exit 0
        fi
    fi

    # Backup env files first
    local backup_dir=""
    if [ "$DRY_RUN" = false ]; then
        backup_dir=$(backup_env_files)
    else
        backup_env_files
    fi

    # Perform teardown steps
    stop_tmux_sessions "$agent_name"
    stop_docker_containers "$agent_name"
    remove_docker_volumes "$agent_name"
    remove_env_files
    remove_node_modules

    show_summary "$backup_dir"
}

main "$@"
