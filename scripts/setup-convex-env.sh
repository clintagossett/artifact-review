#!/bin/bash
# Setup Convex environment variables including JWT keys
#
# This script automates the tedious process of:
# 1. Generating RSA key pair for JWT signing
# 2. Formatting public key as JWKS
# 3. Setting all required Convex environment variables
# 4. Retrieving admin key from running container
#
# Prerequisites:
# - Docker container must be running (mark-backend or mark-backend-1)
# - openssl and jq must be installed
#
# Usage:
#   ./scripts/setup-convex-env.sh           # Full setup (or refresh admin key if JWT exists)
#   ./scripts/setup-convex-env.sh --check   # Check current state
#   ./scripts/setup-convex-env.sh --regen   # Regenerate JWT keys (invalidates all sessions!)
#
# Documentation:
#   - docs/setup/troubleshooting.md - Common issues and fixes
#   - docs/setup/local-infrastructure.md - DNS and auth architecture
#   - docs/architecture/decisions/0018-jwt-and-authentication-architecture.md - JWT details
#
# Related troubleshooting:
#   - BadAdminKey errors: This script refreshes the admin key automatically
#   - JWT "Invalid byte 92": This script sets keys with proper formatting
#   - Auth not working after reset: Run this script then restart Next.js

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"
AGENT_DIR="$(dirname "$PROJECT_ROOT")"
AGENT_CONFIG="$AGENT_DIR/.env.agent.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load agent config
if [ -f "$AGENT_CONFIG" ]; then
    source "$AGENT_CONFIG"
fi
AGENT_NAME="${AGENT_NAME:-mark}"

echo "==========================================="
echo "Convex Environment Setup for agent: $AGENT_NAME"
echo "==========================================="
echo ""

# Check prerequisites
check_prerequisites() {
    local missing=()

    if ! command -v openssl &> /dev/null; then
        missing+=("openssl")
    fi

    if ! command -v jq &> /dev/null; then
        missing+=("jq")
    fi

    if ! command -v npx &> /dev/null; then
        missing+=("npx (Node.js)")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}Missing required tools: ${missing[*]}${NC}"
        exit 1
    fi

    echo -e "${GREEN}Prerequisites OK${NC}"
}

# Check if container is running
# Returns container name on stdout, status messages go to stderr
check_container() {
    local container_name="${AGENT_NAME}-backend"

    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        # Try old naming convention
        container_name="${AGENT_NAME}-backend-1"
        if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
            echo -e "${RED}Backend container not running.${NC}" >&2
            echo "Start it first: ./scripts/start-dev-servers.sh" >&2
            exit 1
        fi
    fi

    echo -e "${GREEN}Container running: $container_name${NC}" >&2
    echo "$container_name"
}

# Generate RSA key pair and JWKS
generate_jwt_keys() {
    echo ""
    echo "Generating RSA key pair for JWT signing..."

    local temp_dir=$(mktemp -d)
    local private_key_file="$temp_dir/private.pem"
    local public_key_file="$temp_dir/public.pem"

    # Generate 2048-bit RSA key pair
    openssl genrsa -out "$private_key_file" 2048 2>/dev/null
    openssl rsa -in "$private_key_file" -pubout -out "$public_key_file" 2>/dev/null

    # Read private key (escape newlines for JSON)
    JWT_PRIVATE_KEY=$(cat "$private_key_file")

    # Extract modulus (n) and exponent (e) for JWKS
    local n=$(openssl rsa -in "$private_key_file" -pubout -outform DER 2>/dev/null | \
        openssl rsa -pubin -inform DER -text -noout 2>/dev/null | \
        grep -A 100 "Modulus:" | tail -n +2 | tr -d ' :\n' | \
        xxd -r -p | base64 | tr '+/' '-_' | tr -d '=\n')

    # Exponent is almost always 65537 = AQAB in base64url
    local e="AQAB"

    # Create JWKS JSON
    JWKS=$(jq -n \
        --arg n "$n" \
        --arg e "$e" \
        '{
            "keys": [{
                "kty": "RSA",
                "n": $n,
                "e": $e,
                "use": "sig",
                "alg": "RS256",
                "kid": "convex-auth-key"
            }]
        }')

    # Cleanup
    rm -rf "$temp_dir"

    echo -e "${GREEN}JWT keys generated${NC}"
}

# Get admin key from container
get_admin_key() {
    local container_name="$1"

    echo ""
    echo "Retrieving admin key from container..."

    # The generate_admin_key.sh outputs "Admin key:" on first line, key on second
    local output=$(docker exec "$container_name" ./generate_admin_key.sh 2>/dev/null)
    ADMIN_KEY=$(echo "$output" | grep -v "^Admin key:" | tail -1)

    if [ -z "$ADMIN_KEY" ]; then
        echo -e "${RED}Failed to get admin key${NC}"
        echo "Container output: $output"
        return 1
    fi

    echo -e "${GREEN}Admin key retrieved${NC}"
}

# Generate instance secret
generate_instance_secret() {
    INSTANCE_SECRET=$(openssl rand -hex 32)
    echo -e "${GREEN}Instance secret generated${NC}"
}

# Check current Convex env state
check_convex_env() {
    echo ""
    echo "Current Convex environment variables:"
    echo "--------------------------------------"

    cd "$APP_DIR"

    local vars=("JWT_PRIVATE_KEY" "JWKS" "SITE_URL" "CONVEX_SELF_HOSTED_URL" "NOVU_API_URL" "NOVU_SECRET_KEY" "INTERNAL_API_KEY")

    for var in "${vars[@]}"; do
        local value=$(npx convex env get "$var" 2>/dev/null || echo "")
        if [ -n "$value" ]; then
            # Truncate long values
            if [ ${#value} -gt 50 ]; then
                echo -e "  ${GREEN}$var${NC}: ${value:0:47}..."
            else
                echo -e "  ${GREEN}$var${NC}: $value"
            fi
        else
            echo -e "  ${RED}$var${NC}: (not set)"
        fi
    done
}

# Set Convex environment variables
set_convex_env() {
    echo ""
    echo "Setting Convex environment variables..."

    cd "$APP_DIR"

    # JWT keys
    echo "  Setting JWT_PRIVATE_KEY..."
    npx convex env set JWT_PRIVATE_KEY "$JWT_PRIVATE_KEY" 2>/dev/null

    echo "  Setting JWKS..."
    npx convex env set JWKS "$JWKS" 2>/dev/null

    # URLs (using DNS names from orchestrator)
    echo "  Setting SITE_URL..."
    npx convex env set SITE_URL "http://${AGENT_NAME}.loc" 2>/dev/null

    echo "  Setting CONVEX_SELF_HOSTED_URL..."
    npx convex env set CONVEX_SELF_HOSTED_URL "http://${AGENT_NAME}.convex.cloud.loc" 2>/dev/null

    # Internal API key for auth callbacks
    if [ -z "$INTERNAL_API_KEY" ]; then
        INTERNAL_API_KEY=$(openssl rand -hex 32)
    fi
    echo "  Setting INTERNAL_API_KEY..."
    npx convex env set INTERNAL_API_KEY "$INTERNAL_API_KEY" 2>/dev/null

    echo -e "${GREEN}Convex environment configured${NC}"
}

# Update local .env.local with admin key
update_env_local() {
    local env_file="$APP_DIR/.env.local"

    echo ""
    echo "Updating $env_file..."

    if [ ! -f "$env_file" ]; then
        echo -e "${YELLOW}Creating new .env.local${NC}"
        touch "$env_file"
    fi

    # Update or add CONVEX_ADMIN_KEY
    if grep -q "^CONVEX_ADMIN_KEY=" "$env_file" 2>/dev/null; then
        sed -i "s|^CONVEX_ADMIN_KEY=.*|CONVEX_ADMIN_KEY=$ADMIN_KEY|" "$env_file"
    else
        echo "CONVEX_ADMIN_KEY=$ADMIN_KEY" >> "$env_file"
    fi

    # Update or add INTERNAL_API_KEY
    if grep -q "^INTERNAL_API_KEY=" "$env_file" 2>/dev/null; then
        sed -i "s|^INTERNAL_API_KEY=.*|INTERNAL_API_KEY=$INTERNAL_API_KEY|" "$env_file"
    else
        echo "INTERNAL_API_KEY=$INTERNAL_API_KEY" >> "$env_file"
    fi

    echo -e "${GREEN}.env.local updated${NC}"
}

# Main
main() {
    local mode="${1:-setup}"

    check_prerequisites

    case "$mode" in
        --check)
            check_convex_env
            ;;
        --regen)
            echo -e "${YELLOW}WARNING: Regenerating JWT keys will invalidate all existing sessions!${NC}"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                echo "Aborted."
                exit 0
            fi

            container=$(check_container)
            generate_jwt_keys
            get_admin_key "$container"
            set_convex_env
            update_env_local

            echo ""
            echo -e "${GREEN}JWT keys regenerated. All users must re-authenticate.${NC}"
            ;;
        *)
            # Check if JWT keys already exist
            cd "$APP_DIR"
            existing_jwt=$(npx convex env get JWT_PRIVATE_KEY 2>/dev/null || echo "")

            if [ -n "$existing_jwt" ]; then
                echo -e "${YELLOW}JWT keys already exist.${NC}"
                echo "Use --regen to regenerate (invalidates all sessions)"
                echo "Use --check to view current state"
                echo ""

                # Still update admin key (it can change on container restart)
                container=$(check_container)
                get_admin_key "$container"

                # Get existing internal key or generate new
                INTERNAL_API_KEY=$(npx convex env get INTERNAL_API_KEY 2>/dev/null || openssl rand -hex 32)

                update_env_local
                check_convex_env
            else
                echo "No JWT keys found. Running full setup..."

                container=$(check_container)
                generate_jwt_keys
                get_admin_key "$container"
                set_convex_env
                update_env_local

                echo ""
                echo -e "${GREEN}Setup complete!${NC}"
                echo ""
                echo "Next steps:"
                echo "  1. Restart convex dev server: tmux kill-session -t ${AGENT_NAME}-convex-dev"
                echo "  2. Run ./scripts/start-dev-servers.sh"
            fi
            ;;
    esac
}

main "$@"
