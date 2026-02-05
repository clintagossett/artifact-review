#!/bin/bash
#
# Setup Novu Email Webhook Integration
#
# This script configures Novu to use our Convex HTTP endpoint for email rendering.
# Instead of Novu sending emails directly via Resend, it will POST to our webhook,
# and Convex renders React Email templates before sending via Resend.
#
# Usage:
#   ./scripts/setup-novu-email-webhook.sh [--check] [--delete]
#
# Prerequisites:
#   - NOVU_SECRET_KEY set in .env.convex.local
#   - NOVU_EMAIL_WEBHOOK_SECRET set in .env.convex.local and synced to Convex
#   - Novu API available at api.novu.loc or NOVU_API_URL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment
if [ -f "$PROJECT_ROOT/.env.docker.local" ]; then
    source "$PROJECT_ROOT/.env.docker.local"
fi

if [ -f "$APP_DIR/.env.convex.local" ]; then
    # Extract specific vars without sourcing (to avoid conflicts)
    NOVU_SECRET_KEY=$(grep "^NOVU_SECRET_KEY=" "$APP_DIR/.env.convex.local" | cut -d'=' -f2)
    NOVU_API_URL=$(grep "^NOVU_API_URL=" "$APP_DIR/.env.convex.local" | cut -d'=' -f2)
    NOVU_EMAIL_WEBHOOK_SECRET=$(grep "^NOVU_EMAIL_WEBHOOK_SECRET=" "$APP_DIR/.env.convex.local" | cut -d'=' -f2)
fi

# Defaults
NOVU_API_URL="${NOVU_API_URL:-https://api.novu.loc}"
AGENT_NAME="${AGENT_NAME:-mark}"
WEBHOOK_URL="https://${AGENT_NAME}.convex.site.loc/novu-email-webhook"

# Validate
if [ -z "$NOVU_SECRET_KEY" ]; then
    echo -e "${RED}Error: NOVU_SECRET_KEY not found in app/.env.convex.local${NC}"
    exit 1
fi

if [ -z "$NOVU_EMAIL_WEBHOOK_SECRET" ]; then
    echo -e "${RED}Error: NOVU_EMAIL_WEBHOOK_SECRET not found in app/.env.convex.local${NC}"
    echo "Generate one with: openssl rand -hex 32"
    exit 1
fi

echo "========================================"
echo "  Novu Email Webhook Setup"
echo "  Agent: $AGENT_NAME"
echo "  API: $NOVU_API_URL"
echo "  Webhook: $WEBHOOK_URL"
echo "========================================"
echo ""

# Function to list integrations
list_integrations() {
    curl -sk "$NOVU_API_URL/v1/integrations" \
        -H "Authorization: ApiKey $NOVU_SECRET_KEY" 2>/dev/null
}

# Function to check if email-webhook exists
check_webhook_exists() {
    list_integrations | jq -e '.data[] | select(.providerId == "email-webhook")' > /dev/null 2>&1
}

# Function to get webhook integration ID
get_webhook_id() {
    list_integrations | jq -r '.data[] | select(.providerId == "email-webhook") | ._id'
}

# Check mode
if [ "$1" == "--check" ]; then
    echo "Checking current integrations..."
    echo ""

    INTEGRATIONS=$(list_integrations)

    echo "Email integrations:"
    echo "$INTEGRATIONS" | jq -r '.data[] | select(.channel == "email") | "  - \(.name) (\(.providerId)) - \(if .active then "ACTIVE" else "inactive" end)"'

    echo ""
    echo "In-App integrations:"
    echo "$INTEGRATIONS" | jq -r '.data[] | select(.channel == "in_app") | "  - \(.name) (\(.providerId)) - \(if .active then "ACTIVE" else "inactive" end)"'

    if check_webhook_exists; then
        echo ""
        echo -e "${GREEN}Email Webhook is configured${NC}"
        WEBHOOK_DATA=$(echo "$INTEGRATIONS" | jq '.data[] | select(.providerId == "email-webhook")')
        echo "  URL: $(echo "$WEBHOOK_DATA" | jq -r '.credentials.webhookUrl')"
        echo "  Active: $(echo "$WEBHOOK_DATA" | jq -r '.active')"
        echo "  Primary: $(echo "$WEBHOOK_DATA" | jq -r '.primary')"
    else
        echo ""
        echo -e "${YELLOW}Email Webhook is NOT configured${NC}"
        echo "Run without --check to create it"
    fi
    exit 0
fi

# Delete mode
if [ "$1" == "--delete" ]; then
    if ! check_webhook_exists; then
        echo -e "${YELLOW}Email Webhook integration not found${NC}"
        exit 0
    fi

    WEBHOOK_ID=$(get_webhook_id)
    echo "Deleting Email Webhook integration ($WEBHOOK_ID)..."

    RESULT=$(curl -sk -X DELETE "$NOVU_API_URL/v1/integrations/$WEBHOOK_ID" \
        -H "Authorization: ApiKey $NOVU_SECRET_KEY" 2>&1)

    if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
        echo -e "${GREEN}Deleted successfully${NC}"
    else
        echo -e "${RED}Failed to delete: $RESULT${NC}"
        exit 1
    fi
    exit 0
fi

# Create mode (default)
if check_webhook_exists; then
    echo -e "${YELLOW}Email Webhook already exists${NC}"
    echo "Use --check to see details or --delete to remove it"
    exit 0
fi

echo "Creating Email Webhook integration..."

RESULT=$(curl -sk -X POST "$NOVU_API_URL/v1/integrations" \
    -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"providerId\": \"email-webhook\",
        \"channel\": \"email\",
        \"name\": \"Convex Email Renderer\",
        \"active\": true,
        \"credentials\": {
            \"webhookUrl\": \"$WEBHOOK_URL\",
            \"secretKey\": \"$NOVU_EMAIL_WEBHOOK_SECRET\"
        }
    }" 2>&1)

if echo "$RESULT" | jq -e '.data._id' > /dev/null 2>&1; then
    INTEGRATION_ID=$(echo "$RESULT" | jq -r '.data._id')
    echo -e "${GREEN}Created successfully!${NC}"
    echo ""
    echo "Integration ID: $INTEGRATION_ID"
    echo "Provider: email-webhook"
    echo "Webhook URL: $WEBHOOK_URL"
    echo "Active: true"
    echo "Primary: true"
    echo ""
    echo "Novu will now POST email payloads to your Convex webhook."
    echo "Convex will render React Email templates and send via Resend."
else
    echo -e "${RED}Failed to create integration${NC}"
    echo "$RESULT" | jq '.' 2>/dev/null || echo "$RESULT"
    exit 1
fi

echo ""
echo "To verify, run: $0 --check"
