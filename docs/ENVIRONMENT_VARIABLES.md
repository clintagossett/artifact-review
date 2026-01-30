# Environment Variables Audit

This document is the **authoritative source** for all environment variables used in the Artifact Review application. It lists variables required for both the Frontend (Next.js) and Backend (Convex).

---

## Environment File Structure

This project uses multiple `.env.*.local` files, each serving a specific purpose. All `.local` files are gitignored.

### File Overview

| File | Location | Purpose | Read By |
|------|----------|---------|---------|
| `.env.docker.local` | Root | Agent identity, ports, domains | Docker Compose, shell scripts |
| `.env.dev.local` | Root | Dev tooling API keys (Vercel, GitHub) | Developer tools only |
| `.env.nextjs.local` | `app/` | Next.js runtime config, test utilities | Next.js, Playwright tests |
| `.env.convex.local` | `app/` | Convex backend secrets (synced to Convex) | `npm run sync-convex-env` |
| `.env.local` | `app/` | Legacy/minimal config for Convex CLI | `npx convex dev` |

### Detailed Descriptions

#### `.env.docker.local` (Root)

**Purpose:** Agent identity and infrastructure configuration.

```bash
# Your unique agent name (used everywhere)
AGENT_NAME=james

# Port assignments (avoid conflicts with other agents)
CONVEX_ADMIN_PORT=3230
CONVEX_HTTP_PORT=3231
APP_PORT=3020

# Derived URLs (based on AGENT_NAME)
SITE_URL=http://james.loc
CONVEX_URL=http://james.convex.cloud.loc
```

**Used by:**
- `docker-compose.yml` - Container naming, port mapping
- `start-dev-servers.sh` - tmux session names
- Other scripts that need agent identity

**Set once:** When cloning the repo. Rarely changes.

#### `.env.dev.local` (Root)

**Purpose:** API keys for developer tooling (NOT runtime).

```bash
# Vercel CLI (for deployments)
VERCEL_TOKEN=...

# GitHub CLI (already configured via gh auth)
# GITHUB_TOKEN=...
```

**Used by:** Developer tools, CI scripts, NOT by the application.

**Security:** Contains sensitive tokens. Never commit.

#### `.env.nextjs.local` (app/)

**Purpose:** Next.js runtime configuration and test utilities.

```bash
# Convex connection
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3230
NEXT_PUBLIC_CONVEX_URL=http://james.convex.cloud.loc
NEXT_PUBLIC_CONVEX_HTTP_URL=http://james.convex.site.loc

# Test utilities (Resend/Mailpit)
RESEND_FULL_ACCESS_API_KEY=re_dummy_key_for_localhost
MAILPIT_API_URL=http://james.mailpit.loc/api/v1

# Novu notifications
NOVU_SECRET_KEY=...
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=...
```

**Used by:**
- Next.js application (`process.env.*`)
- Playwright tests (loaded by `playwright.config.ts`)

**Sync:** NOT synced anywhere. Used directly by Next.js.

#### `.env.convex.local` (app/)

**Purpose:** Convex backend environment variables.

```bash
# Authentication & URLs
SITE_URL=http://james.loc
INTERNAL_API_KEY=...

# Email (local dev uses Mailpit, not Resend)
RESEND_API_KEY=re_dummy_key_for_localhost
EMAIL_FROM_AUTH="Auth <auth@test.com>"

# Novu
NOVU_SECRET_KEY=...
NOVU_API_URL=http://api.novu.loc

# ⚠️ JWT keys are NOT stored here - see JWT Key Management section
```

**Used by:** `npm run sync-convex-env` → pushes to Convex deployment

**Sync:** Run `npm run sync-convex-env` after editing.

**Safety:** Script blocks if JWT keys are found in file.

#### `.env.local` (app/)

**Purpose:** Minimal config for Convex CLI tools.

```bash
# Used by npx convex dev to find the deployment
CONVEX_SELF_HOSTED_URL=http://james.convex.cloud.loc
NEXT_PUBLIC_CONVEX_URL=http://james.convex.cloud.loc
NEXT_PUBLIC_CONVEX_HTTP_URL=http://james.convex.site.loc
```

**Used by:** `npx convex dev`, `npx convex env` commands

**Note:** This is a simpler file. Most config is in `.env.nextjs.local`.

### First-Time Setup

```bash
# 1. Set your agent identity
cp .env.docker.local.example .env.docker.local
# Edit AGENT_NAME=your-name

# 2. Copy other env files
cp .env.dev.local.example .env.dev.local
cp app/.env.nextjs.local.example app/.env.nextjs.local
cp app/.env.convex.local.example app/.env.convex.local

# 3. Run init script (handles most configuration)
./scripts/agent-init.sh
```

### Which File Do I Edit?

| I want to... | Edit this file |
|--------------|----------------|
| Change my agent name or ports | `.env.docker.local` |
| Add a Vercel/GitHub token | `.env.dev.local` |
| Configure Next.js or tests | `app/.env.nextjs.local` |
| Add a Convex env var | `app/.env.convex.local` then `npm run sync-convex-env` |
| Set/reset JWT keys | Run `./scripts/setup-convex-env.sh` (NOT a file) |

---

## 1. Backend Variables (Convex Dashboard)

These variables must be set in the **Convex Dashboard** under **Project Settings** -> **Environment Variables**. They are accessible by your backend code (`convex/`).

### 🚨 Critical
| Variable Name | Description | Used In Files |
| :--- | :--- | :--- |
| `INTERNAL_API_KEY` | **Secret Key**. Authenticates the internal bridge between Auth.js and Convex. Must be a strong random string. | `convex/http.ts`, `convex/auth.ts` |
| `RESEND_API_KEY` | **Secret Key**. Your Resend API Key (starts with `re_`). <br><br> **Security Note:**<br> - **Local Dev (`.env.local`)**: Use **Full Access Key** (Required for E2E tests to read/verify emails).<br> - **Hosted (Dashboard)**: Use **Sending Only Key** (Best practice for security). | `convex/http.ts`, `convex/checkEnv.ts`, coverage in `tests/e2e/utils/resend.ts` |
| `SITE_URL` | **Configuration**. The public URL of your Frontend (e.g., `https://artifactreview.com`). Used for Stripe and authentication redirects. | `convex/lib/urls.ts`, `convex/checkEnv.ts` |
| `JWT_PRIVATE_KEY` | **Auth Key**. Private key for signing authentication tokens. **IMPORTANT:** Set directly in Convex via `./scripts/setup-convex-env.sh`, NOT in `.env.local` or `.env.convex.local`. See [JWT Key Management](#jwt-key-management) below. | `@convex-dev/auth` |
| `JWKS` | **Auth Key**. Public key set for verifying tokens. **IMPORTANT:** Set directly in Convex via `./scripts/setup-convex-env.sh`, NOT in `.env.local` or `.env.convex.local`. See [JWT Key Management](#jwt-key-management) below. | `@convex-dev/auth` |
| `STRIPE_KEY` | **Secret Key**. Standard Stripe Secret Key (starts with `sk_`). | `convex/stripe.ts` |
| `STRIPE_SECRET_KEY` | **Secret Key**. Duplicate of `STRIPE_KEY`, specifically required by the `@convex-dev/stripe` component. | `@convex-dev/stripe` |
| `STRIPE_WEBHOOK_SECRET` | **Secret Key**. Webhook signing secret (starts with `whsec_`) for verifying Stripe events. | `convex/http.ts` |

### 📧 Email Configuration
| Variable Name | Description | Used In Files |
| :--- | :--- | :--- |
| `EMAIL_FROM_AUTH` | **Sender Address**. The "From" address for magic link emails (e.g., `Auth <auth@domain.com>`). | `convex/http.ts` |
| `EMAIL_FROM_NOTIFICATIONS` | **Sender Address**. The "From" address for invitation emails (e.g., `Notify <notify@domain.com>`). | `convex/access.ts` |
 
 ### 💳 Billing (Stripe)
 | Variable Name | Description | Used In Files |
 | :--- | :--- | :--- |
 | `STRIPE_PRICE_ID_PRO` | **Plan ID**. Monthly price ID for the Pro Tier (from Stripe Dashboard). | `convex/stripe/plans.ts` |
 | `STRIPE_PRICE_ID_PRO_ANNUAL` | **Plan ID**. Annual price ID for the Pro Tier (from Stripe Dashboard). | `convex/stripe/plans.ts` |

### ℹ️ Optional / Development
| Variable Name | Description | Default | Used In Files |
| :--- | :--- | :--- | :--- |
| `SKIP_EMAILS` | Set to `"true"` to suppress all email sending. Useful for seed scripts or local dev. | `false` | `convex/access.ts` |
| `RESEND_TEST_MODE` | Set to `"false"` to send *real* emails. Defaults to `"true"` (safe mode). | `true` | `convex/lib/resend.ts` |
| `LOG_LEVEL` | Logging verbosity: `debug`, `info`, `warn`, `error`. | `debug` | `convex/lib/logger.ts` |

### 🔒 System Variables (Managed by Convex)
| Variable Name | Description |
| :--- | :--- |
| `CONVEX_SITE_URL` | The public URL of your Convex Deployment HTTP actions. Automatically set by Convex. Used in `convex/auth.ts` and `convex/auth.config.ts`. |

---

## 2. Frontend Variables (.env.local / Vercel)

These variables must be set in your local `.env.local` file and in your Frontend Hosting Provider (e.g., Vercel, Netlify). They are exposed to the browser.

### 🚨 Critical
| Variable Name | Description | Used In Files |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CONVEX_URL` | **Configuration**. The URL of your Convex Backend (e.g., `https://mild-ptarmigan-109.convex.cloud`). | `src/components/ConvexClientProvider.tsx` |
| `NEXT_PUBLIC_CONVEX_HTTP_URL` | **Configuration**. The HTTP Actions URL of your Convex Backend (e.g., `https://mild-ptarmigan-109.convex.site`). Used for proxying artifacts. | `src/app/api/artifact/.../route.ts` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Stripe Key**. Publicly accessible key (starts with `pk_test_`) for the Stripe Elements / Checkout client. | `src/components/settings/BillingSection.tsx` |

### 🔔 Notifications (Novu)
These are set in **Vercel** (or `.env.local` for local dev).
| Variable Name | Description | Used In Files |
| :--- | :--- | :--- |
| `NOVU_SECRET_KEY` | **Secret Key**. Private API key from Novu dashboard. | `/api/novu/route.ts`, `convex/novu.ts` |
| `NOVU_API_URL` | **Configuration**. Novu API endpoint URL (server-side). For local dev with shared orchestrator: `http://api.novu.loc`. Leave unset for Novu Cloud. | `convex/novu.ts`, `tests/e2e/smoke-integrations.spec.ts` |
| `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` | **Configuration**. Public App ID for the frontend SDK. | `src/components/NotificationCenter.tsx` |
| `NEXT_PUBLIC_NOVU_API_URL` | **Configuration**. Novu API endpoint URL (browser-side). For local dev: `http://api.novu.loc`. Required for self-hosted Novu. | `src/components/NotificationCenter.tsx` |
| `NEXT_PUBLIC_NOVU_SOCKET_URL` | **Configuration**. Novu WebSocket URL (browser-side). For local dev: `http://ws.novu.loc`. Required for self-hosted Novu real-time notifications. | `src/components/NotificationCenter.tsx` |

### Local Development Mode (Shared Orchestrator)
The agentic-dev infrastructure runs a **shared Novu instance** managed by the orchestrator:

| Service | URL |
|---------|-----|
| Novu Dashboard | `http://novu.loc` |
| Novu API | `http://api.novu.loc` |

To use the shared instance:
1. Start the orchestrator: `cd /path/to/agentic-dev/orchestrator && ./start.sh`
2. Set in `.env.local`: `NOVU_API_URL=http://api.novu.loc`
3. Start your dev servers: `./scripts/start-dev-servers.sh`

**Note:** The shared Novu is DNS-routed via dnsmasq. No per-agent Novu containers needed.

### 📬 Mailpit (Local Email Testing)
| Variable Name | Description | Used In Files |
| :--- | :--- | :--- |
| `MAILPIT_API_URL` | **Configuration**. Mailpit API endpoint for local email testing. Set for local dev only (e.g., `http://{agent}.mailpit.loc/api/v1`). Leave unset for hosted environments. | `tests/utils/resend.ts` |
| `NOVU_DIGEST_INTERVAL` | **Configuration**. Digest window in minutes (Default: `10`). Set to `0` or `1` for E2E tests. | `src/app/api/novu/workflows/comment-workflow.ts` |

### ℹ️ Optional
| Variable Name | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_LOG_LEVEL` | Frontend logging verbosity: `debug`, `info`, `warn`, `error`. | `debug` |

---

## 3. Local Development (`.env.local` and `.env.convex.local`)

### Frontend Config (`.env.local` or `.env.nextjs.local`)

```bash
# Deployment used by npx convex dev
CONVEX_DEPLOYMENT=...

# Frontend Config
NEXT_PUBLIC_CONVEX_URL=https://...
NEXT_PUBLIC_CONVEX_HTTP_URL=https://...

# Local email testing
MAILPIT_API_URL=http://{agent}.mailpit.loc/api/v1
RESEND_FULL_ACCESS_API_KEY=re_dummy_key_for_localhost  # Not used locally (Mailpit handles emails)
```

### Backend Config (`.env.convex.local`)

**IMPORTANT:** JWT keys (JWT_PRIVATE_KEY, JWKS) are NOT stored in this file.
They are set directly in Convex. See [JWT Key Management](#jwt-key-management) below.

```bash
# Internal API key for server-to-server auth
INTERNAL_API_KEY=...

# Email config (local dev uses Mailpit, not Resend)
RESEND_API_KEY=re_dummy_key_for_localhost
EMAIL_FROM_AUTH="Auth <auth@test.com>"
EMAIL_FROM_NOTIFICATIONS="Notify <notify@test.com>"

# Novu config
NOVU_SECRET_KEY=...
NOVU_API_URL=http://api.novu.loc

# URLs
SITE_URL=http://{agent}.loc
CONVEX_SELF_HOSTED_URL=http://{agent}.convex.cloud.loc
```

**Sync to Convex:** After editing `.env.convex.local`, run:
```bash
npm run sync-convex-env
```

**Safety:** The sync script will block if it finds JWT keys in the file.

---

## JWT Key Management

JWT keys (`JWT_PRIVATE_KEY` and `JWKS`) are **critical authentication secrets** that require special handling.

### Why JWT Keys Are Different

| Concern | Other Env Vars | JWT Keys |
|---------|----------------|----------|
| **Storage** | `.env.convex.local` | Convex deployment only |
| **Sync method** | `npm run sync-convex-env` | `./scripts/setup-convex-env.sh` |
| **Can overwrite?** | Yes, safe to update | **NO** - invalidates all sessions |
| **Backup** | Not needed (can recreate) | Lives in Docker volume |

### Initial Setup

JWT keys are automatically generated and set during first-time setup:

```bash
./scripts/agent-init.sh
# OR manually:
./scripts/setup-convex-env.sh
```

### Verify Keys Are Set

```bash
cd app
npx convex env get JWT_PRIVATE_KEY
npx convex env get JWKS
```

### Regenerate Keys (Caution!)

Only regenerate if keys are compromised or volume was destroyed:

```bash
./scripts/setup-convex-env.sh --regen
```

⚠️ **Warning:** This invalidates ALL existing user sessions.

### Common Mistakes to Avoid

❌ **Don't add JWT keys to `.env.convex.local`**
```bash
# WRONG - will be blocked by sync script
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
JWKS={"keys":[...]}
```

❌ **Don't run `npx convex env set` manually for JWT keys**
```bash
# WRONG - use setup-convex-env.sh instead
npx convex env set JWT_PRIVATE_KEY "..."
```

✅ **Correct way to manage JWT keys:**
```bash
# Initial setup or regeneration
./scripts/setup-convex-env.sh

# Verify
npx convex env get JWT_PRIVATE_KEY
```

### Troubleshooting

**"JWT keys not set" error:**
```bash
./scripts/setup-convex-env.sh
```

**"sync-convex-env blocked by JWT keys":**
1. Remove `JWT_PRIVATE_KEY` and `JWKS` lines from `.env.convex.local`
2. Run `npm run sync-convex-env` again

**Sessions invalidated after container restart:**
- JWT keys should persist in Docker volume
- If lost, run `./scripts/setup-convex-env.sh --regen`
- Users will need to re-authenticate

---

## 4. Standard Runtime Variables

The following are standard Node.js/CI variables used by the system. You generally do not need to set these manually.

| Variable Name | Description | Used In Files |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode: `development`, `production`, or `test`. | Used throughout app for environment-specific logic. |
| `CI` | Continuous Integration flag. Set to `true` in CI environments (e.g., GitHub Actions). | `playwright.config.ts` |

## 5. Build & Deployment Variables (Vercel Project Settings)
These variables are used during the build process on Vercel to deploy your Convex functions.

| Variable Name | Description | Used By |
| :--- | :--- | :--- |
| `CONVEX_DEPLOY_KEY` | **Secret Key**. Authenticates Vercel to deploy your Convex functions. Found in Convex Dashboard -> Project Settings -> Deploy Keys. | `npx convex deploy` (Vercel Build Command) |

