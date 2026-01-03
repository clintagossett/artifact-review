# JWT Key Setup for Local Development

## Overview

Convex Auth requires matching RSA keypairs for JWT token signing and verification:
- **JWT_PRIVATE_KEY**: Used by the backend to sign authentication tokens
- **JWKS**: JSON Web Key Set containing the public key used to verify token signatures

**CRITICAL**: These keys MUST be generated together as a matching pair. Mismatched keys will cause authentication failures with "Could not verify OIDC token claim" errors.

## Setup Process

### 1. Generate Key Pair

Use the official Convex Auth method with the `jose` library:

```bash
cd app
node generateKeys.mjs
```

This script (`app/generateKeys.mjs`) generates a proper RS256 keypair and outputs both values in the correct format.

### 2. Update Convex Dashboard

The Convex CLI cannot handle multi-line environment variables, so keys must be set manually via the dashboard:

1. Go to https://dashboard.convex.dev/d/mild-ptarmigan-109
2. Navigate to **Settings** → **Environment Variables**
3. Find `JWT_PRIVATE_KEY` and click **Edit**
4. Replace the entire value with the `JWT_PRIVATE_KEY` output from step 1
   - **IMPORTANT**: Preserve newlines - paste the entire multi-line private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
5. Find `JWKS` and click **Edit**
6. Replace the entire value with the `JWKS` output from step 1
7. Save both variables

### 3. Verify Setup

After updating the keys:

1. Refresh your local development server
2. Navigate to http://localhost:3000
3. Click "Start Using Artifact Review"
4. Verify you see "Anonymous session" and a User ID

If you see WebSocket AuthError messages in the browser console, the keys are likely still mismatched.

## Files

- **app/generateKeys.mjs**: Official key generation script using `jose`
- **app/NEW_ENV_VARS.txt**: Example output showing proper key format (contains actual keys from our setup)

## Common Issues

### "Could not verify OIDC token claim"

**Cause**: JWT_PRIVATE_KEY and JWKS are from different keypairs

**Fix**: Regenerate both keys using `generateKeys.mjs` and update both values in the dashboard

### Keys Appear on One Line in Dashboard

**Cause**: Newlines were stripped during copy/paste

**Fix**: Ensure you're copying from a text file that preserves newlines, not from terminal output where they may be escaped as `\n`

### CLI Error: "Invalid value"

**Cause**: `npx convex env set` doesn't support multi-line values

**Fix**: Use the Convex dashboard instead of the CLI for setting JWT_PRIVATE_KEY

## Reference

- [Convex Auth Documentation](https://labs.convex.dev/auth/setup)
- [jose library](https://github.com/panva/jose) - Used for key generation
