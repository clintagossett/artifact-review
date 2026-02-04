# Email Configuration

This document explains how email works in different environments and clarifies the relationship between Resend, Mailpit, and test modes.

## Quick Reference: Email Addresses

| Email Address | Purpose | Used For | Environment Variable | Sent Via |
|---------------|---------|----------|---------------------|----------|
| `auth@artifactreview-early.xyz` (staging)<br/>`auth@artifactreview.com` (prod) | Authentication emails | Magic links, password resets | `EMAIL_FROM_AUTH` | Direct Resend (Convex) |
| `notify@artifactreview-early.xyz` (staging)<br/>`notify@artifactreview.com` (prod) | Notification emails | Invitations, comments, mentions | `EMAIL_FROM_NOTIFICATIONS` | Novu → Resend |

**Display Name:** Both use `"Artifact Review"` as the sender name.

See [Email Addresses](#email-addresses) section below for detailed explanation.

## Overview

The application sends emails for:
- Magic link authentication
- Comment notifications
- Invitation emails

The email delivery mechanism **differs by environment**.

### Email Addresses

The application uses **two separate email addresses** for different types of communications:

| Email Address | Purpose | Environment Variable | Display Name |
|---------------|---------|---------------------|--------------|
| `auth@artifactreview-early.xyz` (staging)<br/>`auth@artifactreview.com` (prod) | Authentication emails (magic links, password resets) | `EMAIL_FROM_AUTH` | "Artifact Review" |
| `notify@artifactreview-early.xyz` (staging)<br/>`notify@artifactreview.com` (prod) | Notification emails (invitations, comments, mentions) | `EMAIL_FROM_NOTIFICATIONS` | "Artifact Review" |

**Why two addresses?**
- Separates authentication-critical emails from social/notification emails
- Allows users to filter notifications separately from login emails
- Improves deliverability by segregating email types
- Enables different rate limiting and monitoring per email type

## Local Development (Self-Hosted Convex)

### How It Works

In local dev, emails bypass Resend entirely and go directly to **Mailpit**.

**Flow:**
1. User triggers email (e.g., magic link request)
2. Convex detects self-hosted environment (`CONVEX_SELF_HOSTED_URL` is set)
3. Email sent via HTTP POST to `http://mailpit:8025/api/v1/send`
4. Mailpit catches the email (viewable at `https://{AGENT_NAME}.mailpit.loc`)

**Code:** See `app/convex/lib/email.ts` lines 18-56

### Configuration

**Required:**
- `MAILPIT_API_URL` in `app/.env.nextjs.local` (for tests to retrieve emails)
- Mailpit Docker container running (handled by `docker-compose.yml`)
- `EMAIL_FROM_AUTH` in `app/.env.convex.local` (used in email templates)
- `EMAIL_FROM_NOTIFICATIONS` in `app/.env.convex.local` (used in email templates)

**NOT Required:**
- ❌ `RESEND_API_KEY` - Not used in local dev
- ❌ `RESEND_FULL_ACCESS_API_KEY` - Not used in local dev
- ❌ Syncing env vars to Convex (Mailpit intercepts locally)

**Default values in `.env.*.local.example`:**
- `RESEND_API_KEY=re_dummy_key_for_localhost` (documentation only)
- `RESEND_FULL_ACCESS_API_KEY=re_dummy_key_for_localhost` (documentation only)
- `EMAIL_FROM_AUTH="Artifact Review <auth@artifactreview-early.xyz>"` (example)
- `EMAIL_FROM_NOTIFICATIONS="Artifact Review <notify@artifactreview-early.xyz>"` (example)

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
- `EMAIL_FROM_AUTH` - Sender address for authentication emails
- `EMAIL_FROM_NOTIFICATIONS` - Sender address for notification emails

**Example configuration:**
```bash
# Staging
npx convex env set EMAIL_FROM_AUTH "Artifact Review <auth@artifactreview-early.xyz>" --project staging
npx convex env set EMAIL_FROM_NOTIFICATIONS "Artifact Review <notify@artifactreview-early.xyz>" --project staging

# Production
npx convex env set EMAIL_FROM_AUTH "Artifact Review <auth@artifactreview.com>" --project prod
npx convex env set EMAIL_FROM_NOTIFICATIONS "Artifact Review <notify@artifactreview.com>" --project prod
```

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

### "Do I need to sync env vars to Convex?"

**For local dev:** Use `./scripts/setup-convex-env.sh`
- This handles JWT keys, admin key, and syncs vars from `.env.convex.local`
- Emails go to Mailpit locally, so `RESEND_API_KEY` is not used
- Run `./scripts/setup-convex-env.sh --sync` to sync new vars non-disruptively

**For hosted environments:** YES
- Must sync all env vars from `.env.convex.local` to Convex deployment
- Includes `RESEND_API_KEY`, JWT keys, Novu keys, etc.

## Environment Variable Summary

| Variable | File | Used By | Local Dev | Hosted |
|----------|------|---------|-----------|--------|
| `RESEND_API_KEY` | `.env.convex.local` | Convex backend (sending) | ❌ Not needed | ✅ Required |
| `RESEND_FULL_ACCESS_API_KEY` | `.env.nextjs.local` | Test utilities (retrieval) | ❌ Not needed | ✅ Required |
| `EMAIL_FROM_AUTH` | `.env.convex.local` | Convex backend (auth emails) | ✅ Required | ✅ Required |
| `EMAIL_FROM_NOTIFICATIONS` | `.env.convex.local` | Convex backend (notification emails) | ✅ Required | ✅ Required |
| `MAILPIT_API_URL` | `.env.nextjs.local` | Test utilities (retrieval) | ✅ Required | ❌ Not used |

## Testing Email Flow

### Local Dev
```bash
# 1. Start dev servers (includes Mailpit)
./scripts/start-dev-servers.sh

# 2. Trigger a magic link
# Visit: https://{AGENT_NAME}.loc
# Click "Sign in with Email"

# 3. View email in Mailpit
# Visit: https://{AGENT_NAME}.mailpit.loc
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

## Novu Integration

Notification emails (invitations, comments, mentions) are sent through **Novu**, which uses Resend as its email provider.

### How Novu Uses Email Addresses

Novu is configured with the `notify@` email address:

**In Novu Dashboard (https://novu.loc or https://dashboard.novu.co):**
1. Navigate to **Integrations** → **Email**
2. Select **Resend** provider
3. Configure:
   - **API Key**: Resend API key for the environment
   - **From Name**: `Artifact Review`
   - **From Email**: `notify@artifactreview-early.xyz` (staging) or `notify@artifactreview.com` (prod)

**Environment-specific configuration:**

| Environment | Novu Instance | From Email | Resend API Key |
|-------------|---------------|------------|----------------|
| Local Dev | Self-hosted (https://novu.loc) | `notify@artifactreview-early.xyz` | Staging key |
| Staging | Novu Cloud | `notify@artifactreview-early.xyz` | Staging key |
| Production | Novu Cloud | `notify@artifactreview.com` | Production key |

### Direct Email vs Novu

The application sends emails through two different paths:

| Email Type | Path | Email Address | Configuration Location |
|------------|------|---------------|------------------------|
| **Authentication** (magic links, password resets) | Direct Resend → Convex | `auth@` | Convex env vars (`EMAIL_FROM_AUTH`) |
| **Notifications** (invitations, comments, mentions) | Novu → Resend | `notify@` | Novu Dashboard Integrations |

This separation ensures:
- Authentication emails are always delivered (not dependent on Novu)
- Notifications can be orchestrated with digests, batching, and preferences
- Different rate limits and monitoring per email type

## See Also

- `app/convex/lib/email.ts` - Direct email sending logic (auth emails)
- `app/convex/novu.ts` - Novu notification triggers
- `app/src/app/api/novu/workflows/comment-workflow.ts` - Notification workflow
- `app/tests/utils/resend.ts` - Test email retrieval utility
- `app/playwright.config.ts` - Test environment configuration
- [Novu Setup Guide](./novu-setup.md) - Complete Novu configuration guide
