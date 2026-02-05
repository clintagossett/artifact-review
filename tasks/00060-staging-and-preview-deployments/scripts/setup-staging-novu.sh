#!/bin/bash
# Setup Novu credentials for Convex Staging Environment
# Task: 00060 - Staging + Preview Deployments

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Novu Cloud Configuration for Staging ===${NC}"
echo ""

# Check for required arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo ""
    echo "Usage: $0 <novu_secret_key> <novu_api_url>"
    echo ""
    echo "Example:"
    echo "  $0 'sk_your_secret_key_here' 'https://api.novu.co'"
    echo ""
    echo "To get these credentials:"
    echo "  1. Go to https://dashboard.novu.co"
    echo "  2. Select or create 'Staging' environment"
    echo "  3. Settings → API Keys → Copy Secret Key"
    echo "  4. Use https://api.novu.co (US) or https://eu.api.novu.co (EU)"
    exit 1
fi

NOVU_SECRET_KEY="$1"
NOVU_API_URL="$2"

# Validate secret key format
if [[ ! "$NOVU_SECRET_KEY" =~ ^sk_ ]]; then
    echo -e "${RED}Error: Invalid Novu secret key format${NC}"
    echo "Secret key should start with 'sk_'"
    exit 1
fi

# Validate API URL
if [[ ! "$NOVU_API_URL" =~ ^https://.*api\.novu\. ]]; then
    echo -e "${YELLOW}Warning: API URL doesn't match expected pattern${NC}"
    echo "Expected: https://api.novu.co or https://eu.api.novu.co"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load staging deploy key
ENV_FILE="../../../../.env.dev.local"
if [[ ! -f "${ENV_FILE}" ]]; then
    echo -e "${RED}Error: Cannot find ${ENV_FILE}${NC}"
    exit 1
fi

echo -e "${YELLOW}Loading staging deploy key...${NC}"
CONVEX_DEPLOY_STAGING=$(grep "^CONVEX_DEPLOY_STAGING=" "${ENV_FILE}" | cut -d'=' -f2-)

if [[ -z "${CONVEX_DEPLOY_STAGING}" ]]; then
    echo -e "${RED}Error: CONVEX_DEPLOY_STAGING not found in ${ENV_FILE}${NC}"
    exit 1
fi

# Export deploy key for Convex CLI
export CONVEX_DEPLOY_KEY="${CONVEX_DEPLOY_STAGING}"

# Change to app directory for Convex commands
cd ../../../app

echo -e "${YELLOW}Setting Novu credentials in Convex staging project...${NC}"
echo ""

# Set NOVU_SECRET_KEY
echo "Setting NOVU_SECRET_KEY..."
npx convex env set NOVU_SECRET_KEY "${NOVU_SECRET_KEY}" --prod

# Set NOVU_API_URL
echo "Setting NOVU_API_URL..."
npx convex env set NOVU_API_URL "${NOVU_API_URL}" --prod

echo ""
echo -e "${GREEN}✓ Novu credentials configured successfully!${NC}"
echo ""
echo -e "${YELLOW}Staging Novu Configuration:${NC}"
echo "  API URL: ${NOVU_API_URL}"
echo "  Secret Key: ${NOVU_SECRET_KEY:0:10}..."
echo ""
echo "To verify:"
echo "  export CONVEX_DEPLOY_KEY=\"${CONVEX_DEPLOY_STAGING}\""
echo "  npx convex env list --prod | grep NOVU"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Deploy schema to staging (if not done yet)"
echo "2. Configure Vercel environment variables"
echo "3. Test notifications in staging environment"
