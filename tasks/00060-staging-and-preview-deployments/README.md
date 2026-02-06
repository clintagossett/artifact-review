# Task 00060: Staging + Preview Deployments with Vercel/Convex + Webhook Routing

**GitHub Issue:** #60
**Status:** In Progress
**Started:** 2026-02-03
**Agent:** Mark

---

## Overview

Enable proper Vercel deployment strategy with staging environment and preview deployments for PRs. This includes configuring Vercel to match our documented 3-tier architecture and implementing webhook routing for Resend (similar to existing Stripe fan-out).

**Updated Strategy:** We've refined our approach to be incremental:
1. **Phase 1:** Get staging working with `artifactreview-early.xyz` (simpler, validates basics)
2. **Phase 2:** Enable preview deployments with webhook routing (complex, dynamic components)

---

## Current State Analysis

### Documentation ✅ COMPLETE
- Updated `docs/architecture/deployment-environments.md` to 3-tier strategy
- Removed "Hosted Dev", added "Preview Deployments"
- Updated all domain references:
  - Staging: `artifactreview-early.xyz`
  - Production: `artifactreview.com`
- Updated ADR 0003, ADR 0004, and setup docs

### Actual Vercel Configuration ❌ NEEDS WORK

**Current Issues:**
1. **Wrong branch as production:** `dev` branch deploying as production target
2. **No production branch set:** `productionBranch: null`
3. **Preview deployments failing:** Build errors in `mark/dev-work` branch
4. **No environment isolation:** All environments use same Convex URL/deploy keys
5. **Domains not assigned:** `artifactreview-early.xyz` not mapped to specific branch

**Current Vercel Projects:**
- `artifact-review` (main project) - prj_doBLCY9dhFFnLAQ1xLpnniJExLNo
- `artifact-review-mark` (agent-specific?) - prj_Y4pn4jXiXeZ688MtUiyVxg6PJ1Ju
- `v0-html-review-platform` (old?) - prj_UyE81SWq78xgkM9puBKN0lCRq6nQ

---

## Phase 1: Staging Environment (CURRENT)

### Goal
Get `artifactreview-early.xyz` working as stable staging environment

### Convex Project Architecture Decision

**Decision:** Create separate Convex projects for each environment (staging, production)

**Why:**
- Practice for production setup (learn the process in staging first)
- Proper isolation between environments
- Better access control
- Migration testing path (staging → prod)
- Only 20-30 minutes of setup, saves headaches later

**Project Structure:**
```
artifact-review-dev (existing)
  ├── dev deployments → Local development
  └── Used for: Local dev experiments only

artifact-review-staging (CREATE NEW)
  ├── prod deployment → STAGING (artifactreview-early.xyz)
  └── preview deployments → PR previews

artifact-review-prod (CREATE LATER)
  └── prod deployment → PRODUCTION (artifactreview.com)
```

**Note:** Convex's "prod" deployment ≠ production environment. Every Convex project has a "prod" deployment (stable) and "dev" deployments (unstable). We use the "prod" deployment of the staging project for our staging environment.

### Email Architecture Decision

**Decision:** Use Novu → Convex Resend → Resend (unified path)

**Problem:** We have both Novu (notification orchestration) and Convex Resend module (delivery tracking). Initial approach was Novu → Resend directly, but this creates webhook confusion - Convex receives Resend webhooks for emails it never sent.

**Solution:** Route all emails through Convex as the single sender of record:

```
Event (comment/reply)
  ↓
Convex triggers Novu.trigger()
  ↓
Novu orchestrates (digest, preferences, timing)
  ↓
Novu Email Webhook → Convex HTTP endpoint
  ↓
Convex Resend → Resend API (single sender)
  ↓
Resend webhook → Convex (delivery, clicks, bounces)
```

**Benefits:**
- ✅ **Single source of truth**: All emails sent by Convex
- ✅ **Clean webhooks**: Convex recognizes all Resend events (no confusion)
- ✅ **Full tracking**: Delivery status, opens, clicks stored in Convex
- ✅ **Novu's value preserved**: Digest batching, user preferences, multi-channel
- ✅ **Analytics queries**: Can query email status from any Convex function

**What Each System Does:**

| System | Responsibility |
|--------|---------------|
| **Novu** | Notification intelligence (digest engine, batching, user preferences, in-app + email coordination) |
| **Convex Resend** | Email sending, delivery tracking, webhook handling, analytics storage |
| **Resend** | Email delivery infrastructure |

**Implementation:**
1. Configure Novu Email Webhook provider (not native Resend provider)
2. Webhook URL: `https://{convex-deployment}.convex.site/novu-email-webhook`
3. Convex HTTP handler receives webhook → renders React Email template → sends via Resend
4. Resend webhooks flow back to Convex for tracking

**Email Templates (React Email):**
- **Location**: `app/emails/` directory (React Email components)
- **Rendering**: Happens in Convex when receiving Novu webhook
- **Flow**: Novu sends data payload → Convex renders template → Convex sends HTML via Resend
- **Benefits**: Templates separate from workflow logic, easy to preview and test
- **Examples**: `CommentDigest.tsx`, `InvitationEmail.tsx`, `WelcomeEmail.tsx`

**Email Addresses:**
- `auth@artifactreview-early.xyz` (staging) / `auth@artifactreview.com` (prod) - Authentication emails (Convex → Resend direct)
- `notify@artifactreview-early.xyz` (staging) / `notify@artifactreview.com` (prod) - Notifications (Novu → Convex → Resend)

**Resend API Keys:**
- Staging Convex Send: `re_XJPMa9Mj_6PZiQaeYaasnZ7UJFV2MdTYo` (used by Convex for all sends)
- Staging Novu (unused): `re_PdDYfFHV_LxWByg7e4tpdu1fcCHzpLgXt` (not needed with webhook approach)

**Research:** See agent output at `/tmp/claude-1000/-home-clint-gossett/tasks/a31569a.output` for full comparison of Novu vs Convex Resend capabilities.

**Implementation Tracked In:** GitHub Issue #71

### Steps

#### 1.1 Create Staging Convex Project ✅ COMPLETE
- [x] Go to https://dashboard.convex.dev/
- [x] Create new project: `artifact-review-staging`
- [x] Get prod deploy key (Settings → Deploy Key)
- [x] Store in `../../.env.dev.local` as `CONVEX_DEPLOY_STAGING=prod:xxx|yyy`
- [x] Document the process for later production setup

**Staging Project URLs:**
- Deployment URL: `https://adventurous-mosquito-571.convex.cloud`
- HTTP Actions URL: `https://adventurous-mosquito-571.convex.site`

**Documentation:** See `docs/setup/convex-project-creation.md` for step-by-step guide

#### 1.2 Configure Convex Staging Project ✅ COMPLETE
- [x] Deploy initial schema/functions to staging project
- [x] Set up environment variables in Convex staging project
  - [x] `RESEND_API_KEY` (staging key) ⚠️ Currently using shared key - needs domain-specific key
  - [x] `SITE_URL=https://artifactreview-early.xyz`
  - [x] `STRIPE_SECRET_KEY` (test mode)
  - [x] `STRIPE_WEBHOOK_SECRET` (from orchestrator)
  - [x] `STRIPE_PRICE_ID_PRO` and `STRIPE_PRICE_ID_PRO_ANNUAL`
  - [x] `EMAIL_FROM_AUTH` and `EMAIL_FROM_NOTIFICATIONS`
  - [x] `INTERNAL_API_KEY` (generated)
  - [x] `NOVU_SECRET_KEY` and `NOVU_API_URL`
- [x] Get staging Convex URLs:
  - [x] `NEXT_PUBLIC_CONVEX_URL` = `https://adventurous-mosquito-571.convex.cloud`
  - [x] `NEXT_PUBLIC_CONVEX_HTTP_URL` = `https://adventurous-mosquito-571.convex.site`

**Script Created:** `scripts/setup-staging-env.sh` - Automated environment configuration
**Variables Set:** 13 environment variables configured successfully

#### 1.3 Configure Vercel Branch Settings
- [ ] Set production branch to `staging` (via Vercel API)
  - This makes `staging` branch the "production" deployment
  - Later we'll change this to `main` when ready for actual production
- [ ] Verify `artifactreview-early.xyz` domain is configured
- [ ] Assign domain to `staging` branch (via Vercel API)

#### 1.4 Configure Environment Variables (Staging-specific)
Set these in Vercel for `staging` branch only:
- [ ] `NEXT_PUBLIC_CONVEX_URL` → Staging Convex URL
- [ ] `CONVEX_DEPLOY_KEY` → Staging deploy key
- [ ] `NEXT_PUBLIC_CONVEX_HTTP_URL` → Staging Convex HTTP URL
- [ ] `SITE_URL` → `https://artifactreview-early.xyz`
- [ ] Novu credentials (staging-specific if available)
- [ ] Resend API key (staging key)

#### 1.5 Fix Build Configuration
Current build command: `cd app && npx convex deploy --cmd 'npm run build'`
Root directory: `app`

**Issue:** Redundant `cd app` when root is already `app`

Options:
- A) Keep root as `app`, change build to `npx convex deploy --cmd 'npm run build'`
- B) Change root to `.`, keep build as `cd app && npx convex deploy --cmd 'npm run build'`

**Decision:** TBD based on what works

#### 1.6 Configure Resend for Staging ✅ COMPLETE
**CRITICAL:** Resend needs proper domain and webhook configuration

- [x] **Generate domain-specific API key:**
  - Resend Dashboard → API Keys → Create API Key
  - Name: `Staging Convex Send`
  - Type: **Production**
  - Key: `re_XJPMa9Mj_6PZiQaeYaasnZ7UJFV2MdTYo`
  - **Updated in Convex staging** ✅
  - **Stored in `../../.env.dev.local`** ✅

- [x] **Verify domain is active:**
  - Resend Dashboard → Domains
  - `artifactreview-early.xyz` has green checkmark ✅

- [x] **Configure webhook:**
  - Resend Dashboard → Webhooks → Add Webhook
  - **Domain:** Select `artifactreview-early.xyz`
  - **Endpoint:** `https://adventurous-mosquito-571.convex.site/resend-webhook`
  - **Events:** Select all (email.sent, email.delivered, email.bounced, etc.)
  - Save webhook ✅

**Why domain-specific:**
- Each webhook only receives events for its domain
- Staging and production webhooks are isolated
- No code filtering needed

#### 1.7 Configure Novu Email Integration ✅ COMPLETE
**CRITICAL:** Novu needs Resend as email provider

**Staging Resend Keys (separate for isolation):**
- Convex backend: `re_XJPMa9Mj_6PZiQaeYaasnZ7UJFV2MdTYo`
- Novu integration: `re_PdDYfFHV_LxWByg7e4tpdu1fcCHzpLgXt`

- [x] **Open Novu Cloud:**
  - Go to https://dashboard.novu.co
  - Organization: "Artifact Review Staging"
  - Environment: "Production" ✅

- [x] **Add Resend Integration:**
  - Dashboard → Integrations → Email
  - Click "Add Provider" → Select "Resend" ✅
  - Configure:
    ```
    API Key: re_PdDYfFHV_LxWByg7e4tpdu1fcCHzpLgXt
    From Name: Artifact Review
    From Email: notify@artifactreview-early.xyz
    ```
  - Toggle "Active" ✅
  - Click "Test" to verify ✅

- [ ] **Verify Novu → Resend flow:**
  - Create test notification in Novu
  - Check Resend dashboard for sent email
  - Verify webhook delivery to Convex

**Email flow:**
```
App → Novu (orchestration) → Resend (delivery) → User
                                      ↓
                                  Webhook → Convex
```

#### 1.8 Configure Automated E2E Testing ✅ COMPLETE

**GitHub Actions Workflow:** `.github/workflows/staging-e2e.yml`

**Trigger:** Runs automatically after successful Vercel deployment to staging

**Workflow Steps:**
1. Listens for `deployment_status` event from Vercel
2. Filters for staging environment (`artifactreview-early.xyz`)
3. Waits for deployment to be fully ready (polls URL up to 30 times)
4. Runs Playwright E2E tests against live staging site
5. Uploads test artifacts (videos, reports) if tests fail
6. On failure:
   - Comments on commit with rollback instructions
   - Creates GitHub issue with investigation checklist
   - Notifies Slack (optional)

**Required GitHub Secrets:**
```bash
# Set using GitHub CLI:
gh secret set RESEND_FULL_ACCESS_API_KEY --body "your-key-here"
gh secret set SLACK_WEBHOOK_URL --body "your-webhook-url"  # Optional
```

**Rollback Options (on E2E failure):**
1. **Vercel Dashboard:** Redeploy previous version at https://vercel.com/clintagossett/artifact-review-staging/deployments
2. **Vercel CLI:** `vercel rollback --token $VERCEL_TOKEN`
3. **Git Revert:** `git revert {sha} && git push origin staging`

**Why Rollback Syncs All Layers:**
- Git commit is source of truth
- Vercel redeploys → triggers Convex deployment
- Novu workflows sync via postbuild script
- All layers (Vercel, Convex, Novu) sync from same commit

**Test Environment Variables:**
- `PLAYWRIGHT_BASE_URL`: Set to staging URL
- `NEXT_PUBLIC_CONVEX_URL`: Staging Convex deployment
- Tests fetch email verification codes via Resend API

**Test User Generation:**
```typescript
// Uses plus addressing for uniqueness:
test.user+{timestamp}-{random}@tolauante.resend.app
```

- [x] Create GitHub Actions workflow file
- [x] Configure deployment_status trigger
- [x] Add wait-for-deployment step (30 attempts, 10s each)
- [x] Configure Playwright E2E tests
- [x] Add artifact upload (test reports, videos)
- [x] Add failure handling (commit comment, issue creation)
- [x] Document required GitHub secrets
- [ ] Set GitHub secrets via CLI
- [ ] Commit and push workflow to staging

#### 1.9 Test Deployment
- [ ] Push change to `staging` branch
- [ ] Verify deployment succeeds
- [ ] Verify it deploys to `artifactreview-early.xyz`
- [ ] **Verify automated E2E tests run:**
  - [ ] Check GitHub Actions for workflow execution
  - [ ] Verify tests pass against live deployment
  - [ ] Check test artifacts uploaded on failure
- [ ] Test basic functionality (auth, artifact upload)
- [ ] Verify Convex staging backend is being used
- [ ] **Test email flow:**
  - [ ] Sign up / magic link works
  - [ ] Comment notification sends
  - [ ] Check Resend webhook delivery

**Success Criteria:**
- ✅ `staging` branch deploys successfully
- ✅ `artifactreview-early.xyz` serves the app
- ✅ Convex staging backend is connected
- ✅ E2E tests run automatically and pass
- ✅ Auth works (Resend emails sending)
- ✅ Novu notifications work (emails via Resend)
- ✅ Resend webhooks deliver to Convex

---

## Phase 2: Preview Deployments (FUTURE)

### Goal
Enable automatic preview deployments for each PR with proper webhook routing

### Architecture

**Preview Environment Strategy:**
```
PR opened/updated
    ↓
Vercel creates preview deployment (automatic)
    ↓
Convex creates preview deployment in staging project (via CONVEX_DEPLOY_STAGING key)
    ↓
Preview URL: artifact-review-git-{branch}-{team}.vercel.app
Convex URL: {random-name}.convex.cloud (within artifact-review-staging project)
```

**Key Point:** Preview deployments use the staging project's deploy key, so they create preview deployments within the `artifact-review-staging` Convex project. This provides isolation from production while sharing the staging project context.

**Webhook Routing:**
```
Resend webhook → Orchestrator router → Fan-out to previews
                                    ↓
                                Route by email metadata
```

### Steps

#### 2.1 Verify Preview Deployment Basics
- [ ] Ensure `CONVEX_DEPLOY_KEY` is set for "preview" target in Vercel
- [ ] Test that Vercel creates preview deployments automatically
- [ ] Verify Convex preview backends are created
- [ ] Check preview deployment URLs are accessible

#### 2.2 Configure Preview Environment Variables
Set these in Vercel for "preview" target:
- [ ] `CONVEX_DEPLOY_KEY` → Use `CONVEX_DEPLOY_STAGING` (previews create preview deployments in staging project)
- [ ] `SITE_URL` → Dynamic (Vercel provides this automatically via VERCEL_URL)
- [ ] Resend: Test mode API key
- [ ] Novu: Staging credentials (shared) OR disabled

#### 2.3 Implement Resend Webhook Routing
Following the Stripe fan-out pattern (ADR-0022):

- [ ] Create Resend webhook receiver in orchestrator
- [ ] Implement routing logic (identify preview by email metadata)
- [ ] Fan-out to correct preview endpoint
- [ ] Add metadata to outgoing emails to track origin

**Key Decision:** How to identify which preview sent an email?
- Option A: Custom email headers with preview URL
- Option B: Email address patterns (e.g., `no-reply+preview123@artifactreview.com`)
- Option C: Metadata in email payload

#### 2.4 Handle OAuth for Preview Deployments
- [ ] Use dev OAuth credentials for previews
- [ ] Add Vercel preview URL pattern to OAuth redirect URIs
  - Google: `https://*-{team}.vercel.app/api/auth/callback/google`
  - GitHub: Similar pattern (or multiple URIs)

#### 2.5 Documentation
- [ ] Document Resend webhook routing architecture
- [ ] Update ADR if needed
- [ ] Add preview deployment testing guide

**Success Criteria:**
- ✅ PR creates preview deployment automatically
- ✅ Preview deployment has isolated Convex backend
- ✅ Preview deployment receives Resend webhooks
- ✅ OAuth works in preview deployments
- ✅ Preview deployments auto-cleanup after PR close/merge

---

## Open Questions

### Phase 1 (Staging)
- [x] Should we create new Convex project for staging? **YES - for practice and proper isolation**
- [ ] Does `staging` branch exist in git? Need to create it from `main` or `dev`
- [ ] What's the current status of `artifactreview-early.xyz` DNS?
- [ ] Document Convex project creation process for later production setup

### Phase 2 (Previews)
- [ ] How to identify preview environment in email webhooks?
- [ ] Shared Resend API key vs per-preview keys? (Likely shared)
- [ ] Should Novu work in previews or be disabled?
- [ ] Preview cleanup - does Vercel handle this automatically? (Yes, 5-14 days)

---

## References

- **GitHub Issue:** #60
- **Audit Document:** `/tmp/.../scratchpad/vercel-audit.md`
- **Architecture Docs:**
  - `docs/architecture/deployment-environments.md`
  - `docs/architecture/decisions/0003-deployment-hosting-strategy.md`
  - `docs/architecture/decisions/0022-stripe-webhook-multi-deployment-filtering.md` (pattern for Resend)
- **Vercel API Docs:** https://vercel.com/docs/rest-api
- **Convex Preview Deployments:** https://docs.convex.dev/production/hosting/preview-deployments

---

## Progress Log

### 2026-02-03 (Afternoon)
- **Convex Project Architecture Decision:** ✅ Complete
  - Decided to create separate Convex project for staging
  - Rationale: Practice for production, proper isolation, worth 20-30 min setup
  - Will create `artifact-review-staging` project
  - Preview deployments will go into staging project (using staging deploy key)
  - Production project (`artifact-review-prod`) created later
  - Updated task plan with new architecture

- **Staging Convex Project Created:** ✅ Complete
  - Created `artifact-review-staging` project in Convex dashboard
  - Deployment URL: `https://adventurous-mosquito-571.convex.cloud`
  - HTTP Actions URL: `https://adventurous-mosquito-571.convex.site`
  - Region: (record from dashboard)
  - Deploy key generated and stored in `../../.env.dev.local` as `CONVEX_DEPLOY_STAGING`
  - Organized deploy keys: DEV, STAGING, PREVIEW (consistent naming)

- **Documentation Created:** ✅ Complete
  - Created `docs/setup/convex-project-creation.md`
  - Comprehensive guide for creating Convex projects
  - Reusable for production setup later
  - Updated `docs/setup/_index.md` to include new documentation

- **Staging Environment Variables Configured:** ✅ Complete
  - Created `scripts/setup-staging-env.sh` automation script
  - Successfully set all required environment variables using Convex CLI
  - Variables configured:
    - Site: `SITE_URL`, `INTERNAL_API_KEY`
    - Email: `RESEND_API_KEY`, `EMAIL_FROM_AUTH`, `EMAIL_FROM_NOTIFICATIONS`
    - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_PRO_ANNUAL`
  - Used deploy key for authentication: `CONVEX_DEPLOY_KEY=prod:adventurous-mosquito-571|...`
  - Verified all variables using `npx convex env list --prod`

- **JWT Keys Configured:** ✅ Complete
  - Created `scripts/setup-staging-jwt.sh` automation script
  - Generated 2048-bit RSA key pair for JWT signing
  - Set `JWT_PRIVATE_KEY` and `JWKS` in staging Convex project
  - Used same process as local development for consistency
  - Verified keys are properly set in staging environment

- **Novu Configuration:** ✅ Complete
  - Created `scripts/setup-staging-novu.sh` automation script
  - **Region:** US (https://api.novu.co)
  - **Organization:** Artifact Review Staging
  - **Environment:** Production (within staging org)
  - Configured in Convex staging:
    - `NOVU_SECRET_KEY=3f7fddff501d19f2ac2fc942ad306b59`
    - `NOVU_API_URL=https://api.novu.co`
  - Frontend credentials (for Vercel later):
    - `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=IYae_Y00bYFI`
    - `NEXT_PUBLIC_NOVU_API_URL=https://api.novu.co`
    - `NEXT_PUBLIC_NOVU_SOCKET_URL=wss://socket.novu.co`
  - Verified all variables set correctly
  - Stored in `../../.env.dev.local` for easy reference/updates

- **Schema Deployed to Staging:** ✅ Complete
  - Deployed all tables, indexes, and functions to staging Convex
  - Installed components: Resend, Stripe
  - Deployment URL: `https://adventurous-mosquito-571.convex.cloud`
  - **Note:** This was a one-time manual deployment for initialization
  - **Future deployments:** Automated via Vercel build process (step 1.4)

### 2026-02-03 (Morning)
- **Documentation Updates:** ✅ Complete
  - Updated deployment-environments.md to 3-tier strategy
  - Removed "Hosted Dev", added "Preview Deployments"
  - Updated all domain references across docs
  - Updated ADR 0003 and ADR 0004
  - Updated setup guides (account-checklist.md, convex-env-setup.md)

- **Vercel Audit:** ✅ Complete
  - Identified 3 Vercel projects (need to understand artifact-review-mark purpose)
  - Found wrong branch as production (`dev` instead of `staging` or `main`)
  - Identified missing environment variable isolation
  - Discovered preview deployment build failures

- **Next Steps:**
  - Start Phase 1: Configure staging environment
  - Verify Convex staging project exists
  - Configure Vercel settings via API
