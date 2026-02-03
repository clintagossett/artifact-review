#!/bin/bash
#
# Setup Novu Organization for Artifact Review (Local Development Only)
#
# This script creates a Novu organization with standard credentials for local development.
# It is idempotent - safe to run multiple times.
#
# Prerequisites:
#   - Orchestrator running (starts shared Novu): cd orchestrator && ./start.sh
#   - Or Novu running directly: cd services/novu && ./start.sh
#
# Usage:
#   ./scripts/setup-novu-org.sh           # Uses defaults (mark agent)
#   ./scripts/setup-novu-org.sh --check   # Only check if setup exists
#
# Standard Credentials (do not change - used by all agents):
#   Email:        admin@mark.loc
#   Password:     Password123$
#   Organization: mark-artifact-review
#

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"

# Load agent config (prefer new location)
AGENT_CONFIG="$PROJECT_ROOT/.env.docker.local"
LEGACY_AGENT_CONFIG="$(dirname "$PROJECT_ROOT")/.env.agent.local"

if [ -f "$AGENT_CONFIG" ]; then
    source "$AGENT_CONFIG"
elif [ -f "$LEGACY_AGENT_CONFIG" ]; then
    source "$LEGACY_AGENT_CONFIG"
fi

# Configuration
NOVU_API_URL="${NOVU_API_URL:-https://api.novu.loc}"
AGENT_NAME="${AGENT_NAME:-mark}"
PROJECT_NAME="artifact-review"

EMAIL="admin@${AGENT_NAME}.loc"
PASSWORD="Password123\$"
ORG_NAME="${AGENT_NAME}-${PROJECT_NAME}"

# Env file to update (prefer new location)
ENV_FILE="$APP_DIR/.env.nextjs.local"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="$APP_DIR/.env.local"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if Novu is available
check_novu_available() {
    log_info "Checking if Novu is available at $NOVU_API_URL..."

    local max_attempts=3
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        # Try to reach the API (404 is fine, means API is up)
        HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$NOVU_API_URL/v1/organizations" 2>/dev/null || echo "000")

        if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "200" ]; then
            log_info "Novu API is available (HTTP $HTTP_CODE)"
            return 0
        fi

        if [ $attempt -lt $max_attempts ]; then
            log_warn "Novu not responding (HTTP $HTTP_CODE), attempt $attempt/$max_attempts..."
            sleep 2
        fi

        attempt=$((attempt + 1))
    done

    log_error "Novu is not available at $NOVU_API_URL"
    log_error ""
    log_error "Please start the orchestrator first:"
    log_error "  cd /home/clint-gossett/Documents/agentic-dev/orchestrator && ./start.sh"
    log_error ""
    log_error "Or start Novu directly:"
    log_error "  cd /home/clint-gossett/Documents/agentic-dev/services/novu && ./start.sh"
    return 1
}

# Try to login with existing credentials
try_login() {
    log_info "Checking if user already exists..."

    LOGIN_RESPONSE=$(curl -sk "$NOVU_API_URL/v1/auth/login" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null)

    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty' 2>/dev/null)

    if [ -n "$TOKEN" ]; then
        log_info "User exists, logged in successfully"
        return 0
    fi

    return 1
}

# Register new user
register_user() {
    log_info "Registering new user: $EMAIL"

    REGISTER_RESPONSE=$(curl -sk "$NOVU_API_URL/v1/auth/register" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"${AGENT_NAME^}\",\"lastName\":\"Admin\"}" 2>/dev/null)

    TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token // empty' 2>/dev/null)

    if [ -n "$TOKEN" ]; then
        log_info "User registered successfully"
        return 0
    fi

    ERROR=$(echo "$REGISTER_RESPONSE" | jq -r '.message // "Unknown error"' 2>/dev/null)
    log_error "Failed to register user: $ERROR"
    return 1
}

# Check if organization exists
check_org_exists() {
    log_info "Checking if organization '$ORG_NAME' exists..."

    ORGS_RESPONSE=$(curl -sk "$NOVU_API_URL/v1/organizations" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)

    ORG_ID=$(echo "$ORGS_RESPONSE" | jq -r ".data[] | select(.name == \"$ORG_NAME\") | ._id // empty" 2>/dev/null)

    if [ -n "$ORG_ID" ]; then
        log_info "Organization '$ORG_NAME' exists (ID: $ORG_ID)"
        return 0
    fi

    return 1
}

# Create organization
create_org() {
    log_info "Creating organization: $ORG_NAME"

    ORG_RESPONSE=$(curl -sk "$NOVU_API_URL/v1/organizations" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"name\":\"$ORG_NAME\"}" 2>/dev/null)

    ORG_ID=$(echo "$ORG_RESPONSE" | jq -r '.data._id // empty' 2>/dev/null)

    if [ -n "$ORG_ID" ]; then
        log_info "Organization created successfully (ID: $ORG_ID)"
        return 0
    fi

    ERROR=$(echo "$ORG_RESPONSE" | jq -r '.message // "Unknown error"' 2>/dev/null)
    log_error "Failed to create organization: $ERROR"
    return 1
}

# Get API keys from environments
get_api_keys() {
    log_info "Fetching API keys..."

    # Need to re-login to get token with org context
    LOGIN_RESPONSE=$(curl -sk "$NOVU_API_URL/v1/auth/login" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null)

    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty' 2>/dev/null)

    if [ -z "$TOKEN" ]; then
        log_error "Failed to get token with org context"
        return 1
    fi

    # Get environments (Development environment for local dev)
    ENVS_RESPONSE=$(curl -sk "$NOVU_API_URL/v1/environments" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)

    # Get Development environment
    DEV_ENV=$(echo "$ENVS_RESPONSE" | jq -r '.data[] | select(.name == "Development")' 2>/dev/null)

    if [ -z "$DEV_ENV" ] || [ "$DEV_ENV" = "null" ]; then
        log_error "Development environment not found"
        return 1
    fi

    APP_IDENTIFIER=$(echo "$DEV_ENV" | jq -r '.identifier' 2>/dev/null)
    SECRET_KEY=$(echo "$DEV_ENV" | jq -r '.apiKeys[0].key' 2>/dev/null)

    if [ -z "$APP_IDENTIFIER" ] || [ -z "$SECRET_KEY" ]; then
        log_error "Failed to extract API keys"
        return 1
    fi

    log_info "API keys retrieved successfully"
    echo ""
    echo "========================================"
    echo "Novu Setup Complete (Local Development)"
    echo "========================================"
    echo ""
    echo "Add these to your .env.local:"
    echo ""
    echo "  NOVU_API_URL=$NOVU_API_URL"
    echo "  NOVU_SECRET_KEY=$SECRET_KEY"
    echo "  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=$APP_IDENTIFIER"
    echo ""
    echo "Login credentials (for web UI at https://novu.loc):"
    echo "  Email:    $EMAIL"
    echo "  Password: $PASSWORD"
    echo ""

    # Export for potential use by calling script
    export NOVU_SECRET_KEY="$SECRET_KEY"
    export NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER="$APP_IDENTIFIER"

    return 0
}

# Update .env.local file
update_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log_warn ".env.local not found at $ENV_FILE, skipping auto-update"
        return 0
    fi

    log_info "Updating .env.local with Novu credentials..."

    # Check if already configured
    if grep -q "^NOVU_SECRET_KEY=" "$ENV_FILE" 2>/dev/null; then
        EXISTING_KEY=$(grep "^NOVU_SECRET_KEY=" "$ENV_FILE" | cut -d= -f2)
        if [ "$EXISTING_KEY" = "$NOVU_SECRET_KEY" ]; then
            log_info ".env.local already has correct NOVU_SECRET_KEY"
        else
            log_warn ".env.local has different NOVU_SECRET_KEY, updating..."
            sed -i "s|^NOVU_SECRET_KEY=.*|NOVU_SECRET_KEY=$NOVU_SECRET_KEY|" "$ENV_FILE"
        fi
    else
        echo "" >> "$ENV_FILE"
        echo "# Novu Configuration (auto-generated by setup-novu-org.sh)" >> "$ENV_FILE"
        echo "NOVU_SECRET_KEY=$NOVU_SECRET_KEY" >> "$ENV_FILE"
    fi

    if grep -q "^NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=" "$ENV_FILE" 2>/dev/null; then
        EXISTING_ID=$(grep "^NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=" "$ENV_FILE" | cut -d= -f2)
        if [ "$EXISTING_ID" = "$NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER" ]; then
            log_info ".env.local already has correct NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER"
        else
            log_warn ".env.local has different NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER, updating..."
            sed -i "s|^NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=.*|NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=$NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER|" "$ENV_FILE"
        fi
    else
        echo "NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=$NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER" >> "$ENV_FILE"
    fi

    log_info ".env.local updated successfully"
    return 0
}

# Update .env.convex.local file (for Convex backend)
update_convex_env_file() {
    local CONVEX_ENV_FILE="$APP_DIR/.env.convex.local"

    if [ ! -f "$CONVEX_ENV_FILE" ]; then
        log_warn ".env.convex.local not found at $CONVEX_ENV_FILE, skipping"
        return 0
    fi

    log_info "Updating .env.convex.local with Novu credentials..."

    # Update or add NOVU_SECRET_KEY
    if grep -q "^NOVU_SECRET_KEY=" "$CONVEX_ENV_FILE" 2>/dev/null; then
        EXISTING_KEY=$(grep "^NOVU_SECRET_KEY=" "$CONVEX_ENV_FILE" | cut -d= -f2)
        if [ "$EXISTING_KEY" = "$NOVU_SECRET_KEY" ]; then
            log_info ".env.convex.local already has correct NOVU_SECRET_KEY"
        else
            log_warn ".env.convex.local has different NOVU_SECRET_KEY, updating..."
            sed -i "s|^NOVU_SECRET_KEY=.*|NOVU_SECRET_KEY=$NOVU_SECRET_KEY|" "$CONVEX_ENV_FILE"
        fi
    else
        echo "" >> "$CONVEX_ENV_FILE"
        echo "# Novu Configuration (auto-generated by setup-novu-org.sh)" >> "$CONVEX_ENV_FILE"
        echo "NOVU_SECRET_KEY=$NOVU_SECRET_KEY" >> "$CONVEX_ENV_FILE"
    fi

    # Update or add NOVU_API_URL
    if grep -q "^NOVU_API_URL=" "$CONVEX_ENV_FILE" 2>/dev/null; then
        EXISTING_URL=$(grep "^NOVU_API_URL=" "$CONVEX_ENV_FILE" | cut -d= -f2)
        if [ "$EXISTING_URL" = "$NOVU_API_URL" ]; then
            log_info ".env.convex.local already has correct NOVU_API_URL"
        else
            log_warn ".env.convex.local has different NOVU_API_URL, updating..."
            sed -i "s|^NOVU_API_URL=.*|NOVU_API_URL=$NOVU_API_URL|" "$CONVEX_ENV_FILE"
        fi
    else
        echo "NOVU_API_URL=$NOVU_API_URL" >> "$CONVEX_ENV_FILE"
    fi

    log_info ".env.convex.local updated successfully"
    return 0
}

# Main
main() {
    echo ""
    echo "Novu Organization Setup (Local Development Only)"
    echo "================================================="
    echo ""
    echo "Standard Credentials:"
    echo "  Email:        $EMAIL"
    echo "  Password:     $PASSWORD"
    echo "  Organization: $ORG_NAME"
    echo ""

    # Check if just checking
    if [ "$1" = "--check" ]; then
        if ! check_novu_available; then
            exit 1
        fi
        if try_login && check_org_exists; then
            log_info "Novu organization is already set up"
            get_api_keys
            exit 0
        else
            log_warn "Novu organization is NOT set up"
            exit 1
        fi
    fi

    # Full setup
    if ! check_novu_available; then
        exit 1
    fi

    # Try login first, register if needed
    if ! try_login; then
        if ! register_user; then
            exit 1
        fi
    fi

    # Check if org exists, create if needed
    if ! check_org_exists; then
        if ! create_org; then
            exit 1
        fi
    fi

    # Get and display API keys
    if ! get_api_keys; then
        exit 1
    fi

    # Update .env.local (frontend vars)
    update_env_file

    # Update .env.convex.local (backend vars for Convex)
    update_convex_env_file

    log_info "Setup complete!"
}

main "$@"
