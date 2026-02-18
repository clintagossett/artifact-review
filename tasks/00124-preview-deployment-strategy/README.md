# Task #00124: Preview Deployment Strategy for Novu, Resend, and Convex

**GitHub Issue:** #124
**Status:** Strategy Review
**Depends on:** Task #00060 (Staging and Preview Deployments)

## Context

Vercel preview deployments for PRs targeting `dev` are failing. The immediate cause is a `CONVEX_DEPLOY_KEY` mismatch:

```
Detected a non-production build environment and "CONVEX_DEPLOY_KEY" for a production Convex deployment.
```

The Vercel project `artifact-review-dev` (production branch: `dev`, Convex: `beaming-oriole-310`) has `CONVEX_DEPLOY_KEY` set to the production deploy key for ALL targets (production + preview + development). Convex refuses to use a production key in a non-production build context.

However, fixing this single env var is insufficient. Preview deployments interact with four external services, each with different isolation capabilities. This document evaluates strategies for each.

## Current Architecture

```
artifact-review-dev     → production branch: dev    → artifactreview-early.dev
artifact-review-staging → production branch: staging → artifactreview-early.xyz
artifact-review-prod    → production branch: main   → artifactreview.com
```

All three Vercel projects connect to the same GitHub repo. Any branch push triggers preview deployment attempts on ALL projects. Currently, none have an "Ignored Build Step" configured.

---

## Service-by-Service Strategy

### 1. Convex Preview Backends

**Current state:** Preview deploy key exists (`CONVEX_DEPLOY_PREVIEW` in `.env.dev.local`) but is not configured in Vercel for the preview target.

**How Convex previews work:**
- `npx convex deploy` with a preview deploy key auto-creates an isolated backend per Git branch name
- Each preview gets separate functions, data, crons, and schema
- Auto-cleanup after 5 days (14 days on Professional plan)
- `--cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL` injects the correct URL into the build subprocess

**What needs to happen:**
- Split `CONVEX_DEPLOY_KEY` in Vercel: production target gets `prod:beaming-oriole-310|...`, preview target gets `preview:clint-gossett:artifact-review-dev|...`
- Remove `CONVEX_DEPLOYMENT` from preview target (not needed; `convex deploy` with preview key handles it)
- Update `vercel.json` build command to use `--cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL`

**Risk:** Low. This is Convex's designed workflow.

---

### 2. Novu (Notifications)

**Current state:** All Vercel targets share the same Novu credentials (`NOVU_SECRET_KEY`, `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER`). These point to the Novu Cloud dev environment.

**The problem:** Each preview deployment would share the same Novu organization, subscribers, and workflows. This means:
- Notifications triggered in one preview could affect subscribers created in another
- No isolation between preview environments for notification state
- Subscriber preferences from one preview persist across others

**Options:**

#### Option A: Disable Novu in previews (Recommended)
- **How:** Don't set `NOVU_SECRET_KEY` or `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` for the preview target
- **Effect:** Notification features gracefully degrade; core review workflow still works
- **Pros:**
  - Zero configuration complexity
  - No cross-preview interference
  - Notifications aren't the core preview testing concern (reviewing artifacts is)
- **Cons:**
  - Can't test notification flows in preview
  - Need separate mechanism to test notifications (staging or local dev)

#### Option B: Share single Novu org across previews
- **How:** Keep current all-target env vars as-is
- **Effect:** All previews share one Novu Development environment
- **Pros:**
  - Zero additional setup
  - Notification features work in previews
- **Cons:**
  - Cross-preview interference (shared subscribers, shared state)
  - Confusing for testers (notifications from multiple previews interleaved)
  - Novu rate limits shared across all previews

#### Option C: Per-preview Novu org via API
- **How:** Create a Novu org during preview build, tear down after
- **Effect:** Full isolation per preview
- **Pros:**
  - Complete isolation
- **Cons:**
  - Novu API doesn't return API keys on org creation (known gap, issue #5556)
  - Complex setup/teardown scripts needed
  - Significantly increases build time
  - Not practical for ephemeral environments

**Recommendation:** Option A. Disable Novu in preview environments. Test notifications in staging or local dev.

---

### 3. Resend (Email / Auth)

**Current state:** All Vercel targets share `RESEND_API_KEY`. The app uses Resend for magic link authentication and notification emails via `artifactreview-early.xyz` domain.

**The problem:** Preview deployments need to send auth emails (magic links) for the login flow to work. But:
- Magic link emails contain a `SITE_URL` callback. For previews, this must be the Vercel preview URL, not `artifactreview-early.dev`
- All previews would send from the same verified domain (`artifactreview-early.xyz`)
- Resend webhook callbacks point to a specific URL, not per-preview

**Options:**

#### Option A: Share Resend API key, set SITE_URL dynamically (Recommended)
- **How:**
  - Keep `RESEND_API_KEY` as all-target
  - For production `SITE_URL`: `https://artifactreview-early.dev`
  - For preview `SITE_URL`: derive from `VERCEL_URL` (set in Next.js config or build script)
  - Resend webhooks: point to production only (previews don't need delivery tracking)
- **Pros:**
  - Auth (magic links) works in previews
  - Minimal configuration
  - Single API key, single verified domain
- **Cons:**
  - Email delivery tracking only works for production
  - All preview emails come from same domain (acceptable for dev/testing)
  - Resend usage/quota shared across all previews

#### Option B: Disable email in previews, use password-only auth
- **How:** Don't set `RESEND_API_KEY` for preview target; fall back to password auth
- **Pros:**
  - No email configuration needed
  - No shared email quota concerns
- **Cons:**
  - Can't test magic link flow in previews
  - Requires password auth to be fully functional (may not be)
  - Reduces preview fidelity

#### Option C: Use Resend sandbox for previews
- **How:** Create a separate sandbox API key for preview target
- **Pros:**
  - Emails don't actually deliver (safe for testing)
  - Resend captures them for inspection
- **Cons:**
  - Auth flow breaks (magic link emails don't reach user)
  - Only useful for verifying email rendering, not flow

**Recommendation:** Option A. Share the Resend API key but set `SITE_URL` dynamically for previews so magic link callbacks go to the correct preview URL.

---

### 4. Stripe (Payments)

**Current state:** All Vercel targets share Stripe test mode keys. ADR #0022 documents a proven webhook filtering pattern using `siteOrigin` metadata.

**The problem:** Stripe webhooks need to reach preview deployments. The current orchestrator fan-out pattern works for local dev but not for Vercel preview URLs.

**Options:**

#### Option A: Disable Stripe webhooks in previews (Recommended)
- **How:** Don't set `STRIPE_WEBHOOK_SECRET` for preview target. Stripe test mode API calls still work (checkout, subscriptions) but webhook callbacks are skipped.
- **Pros:**
  - Subscription creation/checkout still works in previews
  - No webhook routing complexity
  - Core billing features testable (create checkout session, redirect to Stripe)
- **Cons:**
  - Webhook-driven features don't work (subscription status updates, payment confirmations)
  - Requires manual testing of webhook flows in staging

#### Option B: Stripe webhook endpoint per preview
- **How:** Register a new Stripe webhook endpoint for each preview deployment URL
- **Pros:**
  - Full webhook flow works in previews
- **Cons:**
  - Stripe limits to 16 webhook endpoints per account
  - Requires setup/teardown automation per preview
  - Complex and fragile

#### Option C: Central webhook router (Cloudflare Worker / API Gateway)
- **How:** Single Stripe webhook endpoint → router → preview deployment
- **Pros:**
  - Scales to any number of previews
  - Follows ADR #0022 fan-out pattern
- **Cons:**
  - Requires additional infrastructure
  - Overkill for preview environments

**Recommendation:** Option A. Stripe API calls work without webhooks. Test full webhook flows in staging.

---

### 5. Vercel Build Configuration

**Current `vercel.json`:**
```json
{
  "buildCommand": "npx convex codegen && ls -R convex && npx convex deploy --cmd 'npm run build'",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": ".next"
}
```

**Issues for preview:**
- `npx convex codegen` requires `CONVEX_DEPLOYMENT` which won't exist for preview
- `ls -R convex` is debug output from development, not needed in CI
- `npx convex deploy --cmd 'npm run build'` handles codegen internally

**Recommendation:** Simplify to:
```json
{
  "buildCommand": "npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd 'npm run build'",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": ".next"
}
```

This works for both production (uses prod deploy key) and preview (uses preview deploy key). The `--cmd-url-env-var-name` ensures Next.js gets `NEXT_PUBLIC_CONVEX_URL` set correctly.

---

### 6. Ignored Build Step (Branch Filtering)

**Problem:** All three Vercel projects (dev, staging, prod) are connected to the same GitHub repo. Any branch push triggers preview build attempts on ALL projects.

**Recommendation:**

For `artifact-review-dev` (production branch: `dev`):
- Add a script that checks the GitHub API for an open PR targeting `dev`
- Production builds (pushes to `dev`): always proceed
- Preview builds: only proceed if branch has a PR open against `dev`

For `artifact-review-staging` and `artifact-review-prod`:
- Simple: `if [ "$VERCEL_ENV" = "production" ]; then exit 1; else exit 0; fi`
- This allows production builds only, skipping all preview builds

---

## Env Var Configuration Summary

| Variable | Production | Preview |
|----------|-----------|---------|
| `CONVEX_DEPLOY_KEY` | `prod:beaming-oriole-310\|...` | `preview:clint-gossett:artifact-review-dev\|...` |
| `CONVEX_DEPLOYMENT` | `prod:beaming-oriole-310` | *(not set - handled by convex deploy)* |
| `NEXT_PUBLIC_CONVEX_URL` | `https://beaming-oriole-310.convex.cloud` | *(injected by convex deploy via --cmd)* |
| `NEXT_PUBLIC_CONVEX_HTTP_URL` | `https://beaming-oriole-310.convex.site` | *(needs investigation - may need build script)* |
| `SITE_URL` | `https://artifactreview-early.dev` | Derived from `VERCEL_URL` |
| `RESEND_API_KEY` | Shared | Shared |
| `STRIPE_SECRET_KEY` | Shared | Shared |
| `STRIPE_WEBHOOK_SECRET` | Set | *(not set - disable webhooks)* |
| `NOVU_SECRET_KEY` | Set | *(not set - disable Novu)* |
| `NEXT_PUBLIC_NOVU_*` | Set | *(not set - disable Novu)* |

## Open Questions

1. **`NEXT_PUBLIC_CONVEX_HTTP_URL` for previews:** `convex deploy --cmd` injects `NEXT_PUBLIC_CONVEX_URL` (WebSocket) but does it also handle the HTTP actions URL? If not, how do preview deploys call HTTP actions?

2. **Auth in previews:** Convex Auth uses `SITE_URL` for redirect URIs. Does the preview `SITE_URL` (derived from `VERCEL_URL`) need to be registered as an allowed redirect URI in the auth config?

3. **Graceful degradation:** Do the Novu and Stripe client components handle missing env vars gracefully, or will they throw errors? Need to verify the app doesn't crash when these services are disabled.

4. **Preview data seeding:** Fresh Convex preview backends have no data. Should we implement a `--preview-run` script to seed test data?

## Decision Needed

Review this strategy and decide:
- [ ] Confirm recommended approach for each service (A/B/C)
- [ ] Resolve open questions
- [ ] Approve implementation plan

Closes #124
