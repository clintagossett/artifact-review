# Agentic SDLC Update: Novu Email Webhook Configuration

**Task:** #71 - Novu -> Convex -> Resend Email Architecture
**Date:** 2026-02-04
**Status:** Fully Automatable via API

---

## Overview

This document outlines how to configure the Novu Email Webhook integration. **Good news:** This can be fully automated via the Novu API - no manual dashboard steps required!

## Automated Setup (Recommended)

### One-Command Setup

```bash
# Run the setup script
./scripts/setup-novu-email-webhook.sh
```

This script:
1. Reads credentials from `app/.env.convex.local`
2. Creates an Email Webhook integration via Novu API
3. Configures webhook URL and HMAC secret
4. Sets the integration as active and primary

### Script Commands

```bash
# Check current configuration
./scripts/setup-novu-email-webhook.sh --check

# Create webhook integration (default)
./scripts/setup-novu-email-webhook.sh

# Delete webhook integration
./scripts/setup-novu-email-webhook.sh --delete
```

---

## Prerequisites Checklist

Before running setup, ensure these are in place:

| Prerequisite | How to Set Up | Verification |
|--------------|---------------|--------------|
| Dependencies | `cd app && npm install --legacy-peer-deps` | `npm ls @react-email/render` |
| Convex functions | `./scripts/start-dev-servers.sh` | Logs show "Convex functions ready!" |
| NOVU_SECRET_KEY | From `./scripts/setup-novu-org.sh` | In `app/.env.convex.local` |
| NOVU_EMAIL_WEBHOOK_SECRET | `openssl rand -hex 32` | In `app/.env.convex.local` |
| Secret synced to Convex | `npx convex env set --env-file .env.nextjs.local -- NOVU_EMAIL_WEBHOOK_SECRET <value>` | `npx convex env get` |

---

## Full Setup Sequence

### Step 1: Generate Webhook Secret (if not exists)

```bash
# Check if already set
grep NOVU_EMAIL_WEBHOOK_SECRET app/.env.convex.local

# If not set, generate and add:
SECRET=$(openssl rand -hex 32)
echo "NOVU_EMAIL_WEBHOOK_SECRET=$SECRET" >> app/.env.convex.local
```

### Step 2: Sync Secret to Convex

```bash
cd app
npx convex env set --env-file .env.nextjs.local -- NOVU_EMAIL_WEBHOOK_SECRET $(grep NOVU_EMAIL_WEBHOOK_SECRET .env.convex.local | cut -d'=' -f2)
```

### Step 3: Create Novu Integration

```bash
cd /path/to/project
./scripts/setup-novu-email-webhook.sh
```

### Step 4: Verify

```bash
./scripts/setup-novu-email-webhook.sh --check
```

Expected output:
```
Email Webhook is configured
  URL: https://mark.convex.site.loc/novu-email-webhook
  Active: true
  Primary: true
```

---

## API Reference

The setup script uses the Novu Integrations API:

### Create Integration

```bash
curl -X POST https://api.novu.loc/v1/integrations \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "email-webhook",
    "channel": "email",
    "name": "Convex Email Renderer",
    "active": true,
    "credentials": {
      "webhookUrl": "https://mark.convex.site.loc/novu-email-webhook",
      "hmacSecretKey": "<your-webhook-secret>"
    }
  }'
```

### List Integrations

```bash
curl https://api.novu.loc/v1/integrations \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY"
```

### Delete Integration

```bash
curl -X DELETE https://api.novu.loc/v1/integrations/$INTEGRATION_ID \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY"
```

---

## Integration with agent-init.sh

To include in the agent initialization flow, add to `scripts/agent-init.sh`:

```bash
# After setup-novu-org.sh completes:
echo "Setting up Novu Email Webhook..."

# Generate webhook secret if not exists
if ! grep -q "NOVU_EMAIL_WEBHOOK_SECRET" "$APP_DIR/.env.convex.local"; then
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    echo "NOVU_EMAIL_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> "$APP_DIR/.env.convex.local"
fi

# Sync to Convex (after other env sync)
WEBHOOK_SECRET=$(grep "NOVU_EMAIL_WEBHOOK_SECRET" "$APP_DIR/.env.convex.local" | cut -d'=' -f2)
cd "$APP_DIR" && npx convex env set --env-file .env.nextjs.local -- NOVU_EMAIL_WEBHOOK_SECRET "$WEBHOOK_SECRET"

# Create Novu integration
./scripts/setup-novu-email-webhook.sh
```

---

## Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Integration exists | `./scripts/setup-novu-email-webhook.sh --check` | "Email Webhook is configured" |
| Webhook URL correct | Check output | `https://{agent}.convex.site.loc/novu-email-webhook` |
| Integration active | Check output | `Active: true` |
| Secret in Convex | `cd app && npx convex env get NOVU_EMAIL_WEBHOOK_SECRET` | 64-char hex string |
| HTTP endpoint works | Trigger test email | Email in Mailpit |

---

## Testing the Integration

### 1. Trigger via Novu Dashboard

1. Go to `https://novu.loc` (or `http://localhost:4200`)
2. Navigate to Workflows > `new-comment`
3. Click "Trigger Test"
4. Fill in subscriber and payload
5. Check Mailpit for rendered email

### 2. Trigger via Application

1. Create a comment on an artifact
2. Wait for digest window (default 10 minutes)
3. Check Mailpit at `https://mailpit.loc`

### 3. Direct Webhook Test

```bash
# Generate HMAC signature
SECRET=$(grep NOVU_EMAIL_WEBHOOK_SECRET app/.env.convex.local | cut -d'=' -f2)
PAYLOAD='{"type":"email","subscriber":{"email":"test@example.com"},"payload":{"artifactDisplayTitle":"Test","authorName":"John","commentPreview":"Test comment","artifactUrl":"https://example.com","isReply":false}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Send test
curl -X POST https://mark.convex.site.loc/novu-email-webhook \
  -H "Content-Type: application/json" \
  -H "x-novu-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

---

## Troubleshooting

### Integration Not Created

**Symptom:** Script fails with API error

**Check:**
```bash
# Verify Novu API is accessible
curl -sk https://api.novu.loc/v1/integrations \
  -H "Authorization: ApiKey $(grep NOVU_SECRET_KEY app/.env.convex.local | cut -d'=' -f2)"
```

### Webhook Not Called

**Symptom:** Emails not appearing in Mailpit after triggering workflow

**Check:**
1. Integration is active: `./scripts/setup-novu-email-webhook.sh --check`
2. No other email provider is active (e.g., Resend direct)
3. Convex HTTP endpoint is reachable: `curl -I https://mark.convex.site.loc/novu-email-webhook`

### HMAC Signature Error

**Symptom:** Convex logs show "Invalid signature"

**Check:**
```bash
# Compare secrets
echo "In .env.convex.local:"
grep NOVU_EMAIL_WEBHOOK_SECRET app/.env.convex.local

echo "In Convex:"
cd app && npx convex env get NOVU_EMAIL_WEBHOOK_SECRET
```

Secrets must match exactly.

---

## Rollback

To disable Email Webhook and return to direct Resend:

```bash
# Delete webhook integration
./scripts/setup-novu-email-webhook.sh --delete

# Optionally, add Resend integration via Novu dashboard
# or configure via API if needed
```

The code is backward compatible - existing inline templates still work.

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/setup-novu-email-webhook.sh` | Automation script |
| `app/convex/http.ts` | HTTP endpoint (`/novu-email-webhook`) |
| `app/convex/novuEmailWebhook.ts` | Processing action |
| `app/convex/emails/*.tsx` | React Email templates |
| `app/convex/lib/emailRenderer.ts` | Template rendering |
| `app/.env.convex.local` | NOVU_EMAIL_WEBHOOK_SECRET |

---

## Summary

**Before:** Manual Novu dashboard configuration required
**After:** Fully automated via `./scripts/setup-novu-email-webhook.sh`

The entire email architecture can now be set up programmatically as part of agent initialization or CI/CD pipelines.
