#!/bin/bash
# Setup Convex Staging Environment Variables
# Task: 00060 - Staging + Preview Deployments

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Convex Staging Environment Setup ===${NC}"
echo ""

# Check if we're in the right directory
if [[ ! -f "../../../../.env.dev.local" ]]; then
    echo -e "${RED}Error: Cannot find ../../../../.env.dev.local${NC}"
    echo "Please run this script from the task scripts directory"
    exit 1
fi

# Load shared secrets from parent .env.dev.local
echo -e "${YELLOW}Loading shared secrets from .env.dev.local...${NC}"
ENV_FILE="../../../../.env.dev.local"

# Load specific variables we need
export CONVEX_DEPLOY_STAGING=$(grep "^CONVEX_DEPLOY_STAGING=" "${ENV_FILE}" | cut -d'=' -f2-)
export RESEND_API_KEY=$(grep "^RESEND_API_KEY=" "${ENV_FILE}" | cut -d'=' -f2-)
export STRIPE_SECRET_KEY=$(grep "^STRIPE_SECRET_KEY=" "${ENV_FILE}" | cut -d'=' -f2-)
export STRIPE_WEBHOOK_SECRET=$(grep "^STRIPE_WEBHOOK_SECRET=" "${ENV_FILE}" | cut -d'=' -f2-)
export STRIPE_PRICE_ID_PRO=$(grep "^STRIPE_PRICE_ID_PRO=" "${ENV_FILE}" | cut -d'=' -f2-)
export STRIPE_PRICE_ID_PRO_ANNUAL=$(grep "^STRIPE_PRICE_ID_PRO_ANNUAL=" "${ENV_FILE}" | cut -d'=' -f2-)

# Verify required variables are set
if [[ -z "${CONVEX_DEPLOY_STAGING:-}" ]]; then
    echo -e "${RED}Error: CONVEX_DEPLOY_STAGING not found in .env.dev.local${NC}"
    exit 1
fi

if [[ -z "${RESEND_API_KEY:-}" ]]; then
    echo -e "${RED}Error: RESEND_API_KEY not found in .env.dev.local${NC}"
    exit 1
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
    echo -e "${RED}Error: STRIPE_SECRET_KEY not found in .env.dev.local${NC}"
    exit 1
fi

# Change to app directory for Convex commands
cd ../../../app

echo -e "${YELLOW}Setting environment variables in Convex staging project...${NC}"
echo ""

# Export deploy key for Convex CLI to use
export CONVEX_DEPLOY_KEY="${CONVEX_DEPLOY_STAGING}"

# Get deployment name from deploy key
# Format: prod:adventurous-mosquito-571|<token>
DEPLOYMENT_NAME=$(echo "${CONVEX_DEPLOY_STAGING}" | cut -d'|' -f1)
echo "Deployment: ${DEPLOYMENT_NAME}"
echo "Using deploy key: ${DEPLOYMENT_NAME}|..."
echo ""

# Site configuration
echo "Setting SITE_URL..."
npx convex env set SITE_URL "https://artifactreview-early.xyz" --prod

# Email configuration (Resend)
echo "Setting email configuration..."
npx convex env set RESEND_API_KEY "${RESEND_API_KEY}" --prod

npx convex env set EMAIL_FROM_AUTH "Artifact Review <auth@artifactreview-early.xyz>" --prod

npx convex env set EMAIL_FROM_NOTIFICATIONS "Artifact Review <notify@artifactreview-early.xyz>" --prod

# Stripe configuration (test mode)
echo "Setting Stripe configuration (test mode)..."
npx convex env set STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY}" --prod

npx convex env set STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET}" --prod

npx convex env set STRIPE_PRICE_ID_PRO "${STRIPE_PRICE_ID_PRO}" --prod

npx convex env set STRIPE_PRICE_ID_PRO_ANNUAL "${STRIPE_PRICE_ID_PRO_ANNUAL}" --prod

# Generate internal API key if not already set
echo "Setting internal API key..."
INTERNAL_API_KEY=$(openssl rand -hex 32)
npx convex env set INTERNAL_API_KEY "${INTERNAL_API_KEY}" --prod

echo ""
echo -e "${GREEN}✓ Environment variables set successfully!${NC}"
echo ""
echo -e "${YELLOW}Note: JWT keys (JWT_PRIVATE_KEY, JWKS) need to be set separately.${NC}"
echo "These are generated during the Convex Auth setup process."
echo ""
echo "To verify all variables are set:"
echo "  export CONVEX_DEPLOY_KEY=\"${CONVEX_DEPLOY_STAGING}\""
echo "  npx convex env ls --prod"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Deploy schema to staging:"
echo "   export CONVEX_DEPLOY_KEY=\"${CONVEX_DEPLOY_STAGING}\""
echo "   npx convex deploy --prod"
echo "2. Configure JWT keys (if needed)"
echo "3. Test the staging environment"
