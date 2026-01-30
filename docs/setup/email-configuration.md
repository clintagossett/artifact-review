# Email Configuration

This document explains how email works in different environments and clarifies the relationship between Resend, Mailpit, and test modes.

## Overview

The application sends emails for:
- Magic link authentication
- Comment notifications
- Invitation emails

The email delivery mechanism **differs by environment**.

## Local Development (Self-Hosted Convex)

### How It Works

In local dev, emails bypass Resend entirely and go directly to **Mailpit**.

**Flow:**
1. User triggers email (e.g., magic link request)
2. Convex detects self-hosted environment (`CONVEX_SELF_HOSTED_URL` is set)
3. Email sent via HTTP POST to `http://mailpit:8025/api/v1/send`
4. Mailpit catches the email (viewable at `http://{AGENT_NAME}.mailpit.loc`)

**Code:** See `app/convex/lib/email.ts` lines 18-56

### Configuration

**Required:**
- `MAILPIT_API_URL` in `app/.env.nextjs.local` (for tests to retrieve emails)
- Mailpit Docker container running (handled by `docker-compose.yml`)

**NOT Required:**
- ❌ `RESEND_API_KEY` - Not used in local dev
- ❌ `RESEND_FULL_ACCESS_API_KEY` - Not used in local dev
- ❌ Syncing env vars to Convex with `npm run sync-convex-env`

**Default values in `.env.*.local.example`:**
- `RESEND_API_KEY=re_dummy_key_for_localhost` (documentation only)
- `RESEND_FULL_ACCESS_API_KEY=re_dummy_key_for_localhost` (documentation only)

These dummy keys:
- ✅ Allow code to load without errors
- ✅ Document what's needed for hosted environments
- ✅ Are NOT sent to Resend (emails go to Mailpit instead)
- ❌ Should NOT be synced to Convex (not needed, would overwrite real keys)

## Hosted Environments (Convex Cloud)

### How It Works

In hosted environments, emails are sent through **Resend**.

**Flow:**
1. User triggers email
2. Convex detects hosted environment (`CONVEX_SELF_HOSTED_URL` is NOT set)
3. Email sent via Resend API using `@convex-dev/resend` component
4. Resend delivers the email

**Code:** See `app/convex/lib/email.ts` lines 59-64

### Configuration

**Required:**
- `RESEND_API_KEY` - API key for sending emails (set via `npx convex env set`)
- `RESEND_FULL_ACCESS_API_KEY` - Full access key for test utilities to retrieve sent emails

## Common Confusion

### "Why do the .example files have dummy Resend keys?"

Two different keys serve different purposes:

1. **`RESEND_API_KEY`** (in `.env.convex.local`)
   - Used by Convex backend to **send** emails
   - Only needed in hosted environments
   - Dummy key in `.example` is documentation

2. **`RESEND_FULL_ACCESS_API_KEY`** (in `.env.nextjs.local`)
   - Used by **test utilities** to retrieve sent emails (for verification)
   - Only needed in hosted environments
   - In local dev, tests retrieve from Mailpit instead

### "Do I need to run `npm run sync-convex-env`?"

**For local dev:** NO
- Emails go to Mailpit, not Resend
- `RESEND_API_KEY` is not used
- Syncing would overwrite working JWT keys with placeholders

**For hosted environments:** YES
- Must sync all env vars from `.env.convex.local` to Convex deployment
- Includes `RESEND_API_KEY`, JWT keys, Novu keys, etc.

## Environment Variable Summary

| Variable | File | Used By | Local Dev | Hosted |
|----------|------|---------|-----------|--------|
| `RESEND_API_KEY` | `.env.convex.local` | Convex backend (sending) | ❌ Not needed | ✅ Required |
| `RESEND_FULL_ACCESS_API_KEY` | `.env.nextjs.local` | Test utilities (retrieval) | ❌ Not needed | ✅ Required |
| `MAILPIT_API_URL` | `.env.nextjs.local` | Test utilities (retrieval) | ✅ Required | ❌ Not used |

## Testing Email Flow

### Local Dev
```bash
# 1. Start dev servers (includes Mailpit)
./scripts/start-dev-servers.sh

# 2. Trigger a magic link
# Visit: http://{AGENT_NAME}.loc
# Click "Sign in with Email"

# 3. View email in Mailpit
# Visit: http://{AGENT_NAME}.mailpit.loc
```

### Hosted
```bash
# 1. Set Resend API key
cd app
npx convex env set RESEND_API_KEY re_your_actual_key

# 2. Trigger email and check Resend dashboard
```

## Troubleshooting

**"No emails appearing in Mailpit"**
- Check Mailpit is running: `docker ps | grep mailpit`
- Check Convex logs: `tmux capture-pane -t {AGENT_NAME}-convex-dev -p | grep -i mail`
- Look for "Email to X sent to Mailpit" in logs

**"Tests can't find emails"**
- Check `MAILPIT_API_URL` is set in `app/.env.nextjs.local`
- Check Playwright loads `.env.nextjs.local` (see `app/playwright.config.ts`)

**"Resend initialization error in tests"**
- Ensure `RESEND_FULL_ACCESS_API_KEY=re_dummy_key_for_localhost` is in `.env.nextjs.local`
- This allows the Resend client to initialize even though it's not used

## See Also

- `app/convex/lib/email.ts` - Email sending logic
- `app/tests/utils/resend.ts` - Test email retrieval utility
- `app/playwright.config.ts` - Test environment configuration
