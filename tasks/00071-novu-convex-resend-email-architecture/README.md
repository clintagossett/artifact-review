# Task #71: Novu -> Convex -> Resend Email Architecture

**GitHub Issue:** #71
**Status:** Implementation Complete
**Branch:** staging

## Summary

Implemented a unified email architecture where Novu orchestrates workflows (digest, preferences) but delegates email rendering and sending to Convex via webhook. React Email templates replace inline HTML for maintainability.

## Target Flow

```
Event → Convex triggers Novu → Novu orchestrates (digest) →
Novu Email Webhook → Convex HTTP endpoint →
Convex renders React Email → Convex sends via Resend →
Resend webhook → Convex (tracking)
```

## Implementation Details

### Phase 1: Foundation Setup (Complete)

**Dependencies Added:**
- `@react-email/components` ^0.0.30
- `@react-email/render` ^1.0.0
- `react-email` ^3.0.0 (devDependency)

**Files:**
- `app/package.json` - Added dependencies
- `app/convex.json` - Created with `node.externalPackages` for React Email bundling

### Phase 2: React Email Templates (Complete)

**Location:** `app/convex/emails/`

| File | Purpose |
|------|---------|
| `components/EmailLayout.tsx` | Shared layout with header, footer, styles |
| `CommentDigestEmail.tsx` | Comment/reply notification digest |
| `InvitationEmail.tsx` | Artifact invitation email |
| `MagicLinkEmail.tsx` | Authentication magic link |
| `index.ts` | Re-exports all templates + types |

All templates:
- **NO `"use node"` directive** - Templates are pure React components
- Import from `@react-email/components`
- Export both component and TypeScript props interface
- Follow consistent styling (black CTA button, gray footer, responsive layout)

> **IMPORTANT:** The `"use node"` directive must NOT be in the email templates. It's only needed in the renderers that call `@react-email/render`. Putting it in templates breaks the Novu bridge endpoint when Next.js imports them.

### Phase 3: Email Rendering Utilities (Complete)

**Two renderers exist for different contexts:**

| Renderer | File | Used By | Has `"use node"`? |
|----------|------|---------|-------------------|
| Convex | `app/convex/lib/emailRenderer.ts` | Webhook handler, direct email sending | Yes |
| Next.js | `app/src/lib/emailRenderer.ts` | Novu workflow bridge | No |

Both provide:
- `EmailTemplate` type union for all supported templates
- `renderEmailTemplate()` - Renders template to HTML string
- `generateEmailSubject()` - Generates subject line based on template type

**Why two renderers?**

The Novu workflow bridge runs in Next.js, which imports the comment-workflow. If we import from `convex/lib/emailRenderer.ts` (which has `"use node"`), it breaks the API route. The Next.js renderer imports the same templates but without the Convex directive.

### Phase 4: Novu Webhook Handler (Complete)

**Environment Variable:**
- `NOVU_EMAIL_WEBHOOK_SECRET` - HMAC secret for webhook verification
- Added to `.env.convex.local.example`

**HTTP Route:** `/novu-email-webhook` in `app/convex/http.ts`

Features:
- HMAC SHA-256 signature verification
- Automatic template detection from payload
- Supports: comment-digest, invitation, magic-link templates
- Fallback passthrough mode for unknown templates

**Processing Action:** `app/convex/novuEmailWebhook.ts`

Handles:
- Comment digest emails (single or batched from digest step)
- Invitation emails
- Magic link emails
- Passthrough mode for subject/body from Novu

## Novu Configuration (Automated)

### One-Command Setup

```bash
./scripts/setup-novu-email-webhook.sh
```

This script automatically:
1. Reads credentials from `app/.env.convex.local`
2. Creates Email Webhook integration via Novu API
3. Configures webhook URL and HMAC secret
4. Sets integration as active and primary

### Script Commands

```bash
# Check current configuration
./scripts/setup-novu-email-webhook.sh --check

# Create webhook integration
./scripts/setup-novu-email-webhook.sh

# Delete webhook integration
./scripts/setup-novu-email-webhook.sh --delete
```

### Prerequisites (Done Automatically)

The webhook secret was generated and synced:
```bash
# Already in app/.env.convex.local:
NOVU_EMAIL_WEBHOOK_SECRET=fc2fb830b0c0994f248073b089c83a41cf977f73f4807afbfe8e7d4dc1bd23a3

# Already synced to Convex
```

## Testing

### Local Webhook Test

Generate test request with HMAC signature:

```bash
# Set your webhook secret
SECRET="your-webhook-secret"

# Test payload
PAYLOAD='{"type":"email","subscriber":{"email":"test@example.com","firstName":"Test"},"payload":{"artifactDisplayTitle":"My Artifact","authorName":"John","commentPreview":"Great work!","artifactUrl":"https://example.com/a/abc123","isReply":false}}'

# Generate HMAC signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Send test request
curl -X POST https://mark.convex.site.loc/novu-email-webhook \
  -H "Content-Type: application/json" \
  -H "x-novu-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

Check Mailpit at `https://mailpit.loc` for rendered email.

### E2E Test Flow

1. Trigger a comment notification (create comment on artifact)
2. Wait for Novu digest window (default 10m, configurable via `NOVU_DIGEST_INTERVAL=30s`)
3. Verify email arrives in Mailpit with React Email styling
4. Check email includes proper header, content, and footer

### Novu Dashboard Test

1. Go to Novu Dashboard > **Workflows** > `new-comment`
2. Click **Trigger Test**
3. Fill in test subscriber and payload
4. Submit and check webhook delivery + Mailpit

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `app/package.json` | Modified | Added React Email dependencies |
| `app/convex.json` | Created | Node external packages config |
| `app/convex/emails/components/EmailLayout.tsx` | Created | Shared email layout |
| `app/convex/emails/CommentDigestEmail.tsx` | Created | Comment notification template |
| `app/convex/emails/InvitationEmail.tsx` | Created | Invitation template |
| `app/convex/emails/MagicLinkEmail.tsx` | Created | Magic link template |
| `app/convex/emails/index.ts` | Created | Template exports |
| `app/convex/lib/emailRenderer.ts` | Created | Rendering utility |
| `app/convex/novuEmailWebhook.ts` | Created | Webhook processing action |
| `app/convex/http.ts` | Modified | Added webhook route |
| `app/.env.convex.local.example` | Modified | Added NOVU_EMAIL_WEBHOOK_SECRET |
| `app/.env.convex.local` | Modified | Added generated webhook secret |
| `scripts/setup-novu-email-webhook.sh` | Created | Automated Novu configuration |

## Architecture Benefits

1. **Separation of Concerns**
   - Novu: Workflow orchestration (digest, preferences, scheduling)
   - Convex: Email rendering + sending + tracking

2. **Maintainable Templates**
   - React Email components instead of inline HTML strings
   - TypeScript type safety for template props
   - Reusable layout component

3. **Unified Sending**
   - All emails go through `sendEmail()` in `lib/email.ts`
   - Single point for logging, tracking, error handling
   - Works with Docker proxy setup (Resend → Mailpit in dev)

4. **Extensibility**
   - Add new templates by creating component + adding to EmailTemplate union
   - Novu workflows automatically use new templates via webhook

## Troubleshooting

### Bridge Endpoint Returns 400/500

**Symptom:** Novu fails with `"BridgeMethodNotConfigured"` or workflow execution errors.

**Cause:** `"use node"` directive in email templates being imported into Next.js API route.

**Fix:**
1. Ensure templates in `convex/emails/` do NOT have `"use node"` at the top
2. Only `convex/lib/emailRenderer.ts` should have `"use node"`
3. Restart dev servers: `./scripts/start-dev-servers.sh --restart`

### Emails Not Arriving in Mailpit

**Symptom:** In-app notifications work, but no email in Mailpit.

**Check:**
1. Email Webhook integration exists: `./scripts/setup-novu-email-webhook.sh --check`
2. Webhook secret matches in both places:
   - `.env.convex.local` → `NOVU_EMAIL_WEBHOOK_SECRET`
   - Novu integration → credentials.secretKey
3. Digest interval has elapsed (check `NOVU_DIGEST_INTERVAL` - default 30s local)

**Debug:**
```bash
# Check Convex logs for webhook calls
source .env.docker.local
tmux capture-pane -t ${AGENT_NAME}-convex-dev -p | grep -i "novu"
```

### Comment Preview Truncated in Email

**Expected behavior:** Comment previews are truncated to ~50 characters in the email template. This is intentional to keep emails concise.

## Unit Tests

**File:** `app/tests/unit/email-renderer.test.ts`

```bash
cd app && npm run test -- email-renderer
```

Tests cover:
- `generateEmailSubject()` for all template types
- `renderEmailTemplate()` produces valid HTML
- Correct content for single/multiple comments
- Correct content for replies vs comments
- Footer present in all templates

## E2E Tests

**File:** `app/tests/e2e/email-digest.spec.ts`

```bash
cd app && npm run test:e2e -- --grep "email"
```

Tests:
- Single comment triggers digest email to owner
- Multiple comments batched into one email
- React Email template styling verified
- Magic link email delivery (smoke test)

## Future Work

- [ ] Phase 7: Migrate existing inline templates (auth.ts magic link, access.ts invitation)
- [ ] Add email logging/analytics table
- [ ] Add email unsubscribe handling via Novu preferences
