#!/bin/bash
# Setup JWT keys for Convex Staging Environment
# Task: 00060 - Staging + Preview Deployments

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Convex Staging JWT Keys Setup ===${NC}"
echo ""

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

echo -e "${YELLOW}Generating RSA key pair for JWT signing...${NC}"

# Create temporary directory for key generation
temp_dir=$(mktemp -d)
private_key_file="$temp_dir/private.pem"
public_key_file="$temp_dir/public.pem"

# Generate 2048-bit RSA key pair
openssl genrsa -out "$private_key_file" 2048 2>/dev/null
openssl rsa -in "$private_key_file" -pubout -out "$public_key_file" 2>/dev/null

# Read private key
JWT_PRIVATE_KEY=$(cat "$private_key_file")

# Extract modulus (n) and exponent (e) for JWKS
n=$(openssl rsa -in "$private_key_file" -pubout -outform DER 2>/dev/null | \
    openssl rsa -pubin -inform DER -text -noout 2>/dev/null | \
    grep -A 100 "Modulus:" | tail -n +2 | tr -d ' :\n' | \
    xxd -r -p | base64 | tr '+/' '-_' | tr -d '=\n')

# Exponent is almost always 65537 = AQAB in base64url
e="AQAB"

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

# Cleanup temp files
rm -rf "$temp_dir"

echo -e "${GREEN}✓ JWT keys generated${NC}"
echo ""

# Change to app directory for Convex commands
cd ../../../app

echo -e "${YELLOW}Setting JWT keys in Convex staging project...${NC}"

# Set JWT_PRIVATE_KEY
echo "Setting JWT_PRIVATE_KEY..."
echo "$JWT_PRIVATE_KEY" | npx convex env set JWT_PRIVATE_KEY --prod

# Set JWKS
echo "Setting JWKS..."
echo "$JWKS" | npx convex env set JWKS --prod

echo ""
echo -e "${GREEN}✓ JWT keys set successfully in staging project!${NC}"
echo ""
echo -e "${YELLOW}Important: These keys are used for signing authentication tokens.${NC}"
echo "Keep them secure and never commit them to version control."
echo ""
echo "To verify JWT keys are set:"
echo "  export CONVEX_DEPLOY_KEY=\"${CONVEX_DEPLOY_STAGING}\""
echo "  npx convex env get JWT_PRIVATE_KEY --prod"
echo "  npx convex env get JWKS --prod"
