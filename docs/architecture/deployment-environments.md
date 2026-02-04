# Deployment Environments & SDLC

**Status:** Active
**Last Updated:** 2026-02-03

## Overview

This project uses a 3-tier environment strategy with automatic preview deployments to ensure quality and stability before production deployment.

```
Local Dev → Preview Deployments (Per PR) → Staging (Validation) → Production
```

**Key Strategy:**
- **Local Dev** - Individual developer testing with Docker stack
- **Preview Deployments** - Automatic isolated environments per PR (Vercel + Convex preview)
- **Staging** - Pre-production validation on `artifactreview-early.xyz`
- **Production** - Customer-facing application on `artifactreview.com`

## Architectural Decisions

### Backend: Hybrid Strategy (Self-hosted Local, Cloud Hosted)

**Decision:** Use a self-hosted Docker stack for **Local Dev** and Convex's hosted cloud service for **Preview, Staging, and Production**.

**Rationale:**
- **Local Isolation** — Complete control over the local environment, offline-capable, and faster sync.
- **Preview Deployments** — Automatic isolated Convex backends per PR for testing changes.
- **Hosted Parity** — Cloud-hosted environments mirror production-grade infrastructure with multi-tenant isolation.
- **Cost-effective** — Local dev costs zero; production uses the Managed service for specialized features and scale.
- **Managed Production** — Production benefits from Convex's automatic scaling, backups, and official support.

**When self-hosted would be considered:**
- ❌ Data sovereignty requirements (none for this project)
- ❌ Must run in private VPC (not required)
- ❌ Need 100+ ephemeral backends for testing (not our use case)

**See also:** [Convex Self-Hosting Docs](https://docs.convex.dev/self-hosting) explicitly recommends hosted for most projects.

---

### Frontend: Vercel (with Direct Convex Account)

**Decision:** Use Vercel for frontend hosting with direct Convex account (not Vercel Marketplace).

**Why Vercel:**
- **Deployment orchestration** — Coordinates backend deploy before frontend build
- **Preview deployments** — Automatic preview deploys per PR with isolated Convex backends (replaces need for persistent "Hosted Dev" environment)
- **Next.js optimized** — Best-in-class for React/Next.js with SSR, App Router, Server Components
- **Git-based workflow** — Auto-deploy on push to branches

**Why Direct Convex Account (not Marketplace):**
- **Billing transparency** — Direct to Convex, no unclear markup
- **Existing account** — Use existing Convex account, no new team created
- **Same orchestration** — Build command provides same coordination benefits
- **Full control** — Direct access to Convex project settings

**Cost:** Vercel Pro ($20/mo) + Convex Professional ($25/mo) = $45/mo

**See also:** [ADR 0003: Deployment & Hosting Strategy](./decisions/0003-deployment-hosting-strategy.md)

---

## Infrastructure Compatibility Matrix

This matrix ensures all components are compatible across environments.

| Component | Local Dev | Preview (PR) | Staging | Production |
|-----------|-----------|--------------|---------|------------|
| **Frontend Hosting** | Local dev server (`npm run dev`) | Vercel (auto per PR) | Vercel (`staging` branch) | Vercel (`main` branch) |
| **Frontend Domain** | `http://localhost:3000` | Auto-generated Vercel URL | `https://artifactreview-early.xyz` | `https://artifactreview.com` |
| **Convex Backend** | **Self-hosted Docker** | Hosted cloud (preview) | Hosted cloud (`staging` project) | Hosted cloud (`prod` project) |
| **Convex URL** | `http://127.0.0.1:3210` | Auto-generated preview URL | Auto-generated (e.g., `wise-fox-789.convex.cloud`) | Auto-generated (e.g., `brave-lion-012.convex.cloud`) |
| **Database** | **SQLite (local container)** | Convex managed (preview data) | Convex managed (staging data) | Convex managed (production data) |
| **HTML Storage** | Local File Storage | Convex File Storage | Convex File Storage | Convex File Storage |
| **Mail Send** | **Mailpit (Docker API)** | Resend (Test Mode) | Resend live (restricted) | Resend live (all users) |
| **Mail Receive** | Not configured | Not configured | Not configured | Not configured* |
| **Email Domain** | N/A (Mailpit capture) | `artifactreview-early.xyz` (test mode) | `artifactreview-early.xyz` | `artifactreview.com` |
| **Resend API Key** | N/A (bypassed locally) | Test key | Staging key | Production key |
| **Auth Provider** | Convex Auth | Convex Auth | Convex Auth | Convex Auth |
| **OAuth Apps** | Dev credentials | Dev credentials | Staging credentials | Production credentials |
| **OAuth Redirects** | `http://localhost:3000/auth/callback` | Auto-generated Vercel URL | `https://artifactreview-early.xyz/auth/callback` | `https://artifactreview.com/auth/callback` |

**\*Note on Mail Receive:** Inbound email handling (e.g., reply-to-comment via email) is not required for MVP. If needed in future, consider:
- Resend supports inbound email via webhooks
- Configure per environment with different webhook endpoints
- See [Resend Inbound Email Docs](https://resend.com/docs/dashboard/emails/inbound-emails)

### Configuration Commands

#### Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Link project to Vercel (one time)
vercel link

# Configure Vercel project:
# 1. Create single Vercel project
# 2. Link to GitHub repo
# 3. Configure branch deployment:
#    - staging branch → artifactreview-early.xyz
#    - main branch → artifactreview.com
#    - PR branches → automatic preview deployments

# Set Convex environment variables in Vercel dashboard:
# Project Settings > Environment Variables
# Set branch-specific values for:
# - NEXT_PUBLIC_CONVEX_URL
# - CONVEX_DEPLOY_KEY
```

#### Convex Setup

**Local Dev (Self-hosted Docker)**

```bash
# 1. Start Docker stack
docker compose up -d

# 2. Push functions to local backend
npx convex dev --once
```

- **Environment**: Managed via `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` in `.env.local`.
- **Emails**: Automatically routed to Mailpit API via `app/convex/lib/email.ts`.
- **Dashboard**: Accessed via `http://localhost:6791`.

**Cloud Environments**

```bash
# Preview (automatic via Vercel)
# - Convex creates isolated preview backend per PR
# - Uses CONVEX_DEPLOY_KEY from Vercel environment variables
# - Inherits staging environment variables by default

# Staging
npx convex deploy --project staging
npx convex env set RESEND_API_KEY=re_staging_xxx --project staging
npx convex env set RESEND_TEST_MODE=false --project staging
npx convex env set RESEND_ALLOWED_RECIPIENTS=test@example.com,qa@example.com --project staging

# Production
npx convex deploy --project prod
npx convex env set RESEND_API_KEY=re_prod_xxx --project prod
npx convex env set RESEND_TEST_MODE=false --project prod
```

**Note:** HTML artifacts are stored in Convex File Storage (included in Professional plan: 100GB storage, 50GB bandwidth/month). See [ADR 0002](./decisions/0002-html-artifact-storage.md) for migration path to Cloudflare R2 when bandwidth exceeds 40GB/month.

#### Vercel + Convex Integration (Direct Account)

Vercel orchestrates frontend + Convex backend deploys via the build command:

**Setup (one-time):**
1. Get `CONVEX_DEPLOY_KEY` from Convex dashboard (Settings → Deploy Key)
2. Add to Vercel environment variables (per environment: dev, staging, prod)
3. Override build command: `npx convex deploy --cmd 'npm run build'`

**Deployment flow:**
```
git push
    ↓
Vercel triggers build
    ↓
npx convex deploy (backend first)
    ↓
Convex validates schema against data
    ↓
npm run build (frontend with CONVEX_URL)
    ↓
Vercel deploys frontend
```

**Preview deployments:**
- Each PR gets a Vercel preview URL + isolated Convex preview backend
- Auto-cleanup after 5-14 days
- Test breaking changes without affecting production

**See also:** [ADR 0003](./decisions/0003-deployment-hosting-strategy.md) for full deployment strategy

---

## Environment Details

### 1. Local Development

**Purpose:** Individual developer testing and feature development

| Aspect | Configuration |
|--------|--------------|
| **Frontend** | Local dev server (`npm run dev`) |
| **Frontend URL** | `http://localhost:3000` |
| **Convex** | **Self-hosted Docker backend** |
| **Convex URL** | `http://127.0.0.1:3210` (API) / `http://127.0.0.1:3211` (Site) |
| **Dashboard URL** | `http://localhost:6791` |
| **Database** | **SQLite (local container)** |
| **Auth** | Convex Auth with dev OAuth apps |
| **Mail Send** | Mailpit (API: `http://localhost:8025/api/v1/send` / UI: `http://localhost:8025`) |
| **Mail Receive** | Not configured |
| **Data** | Isolated local SQLite data |

**Testing:**
- Unit tests run locally with Vitest
- Manual feature testing
- Quick iteration cycle

**Who uses it:** Individual developers

---

### 2. Preview Deployments (Per PR)

**Purpose:** Isolated testing environment for each pull request

| Aspect | Configuration |
|--------|--------------|
| **Frontend** | Vercel (automatic per PR) |
| **Frontend URL** | Auto-generated Vercel URL (e.g., `artifact-review-git-branch-team.vercel.app`) |
| **Convex** | Hosted cloud (isolated preview backend) |
| **Convex URL** | Auto-generated preview URL |
| **Database** | Convex managed (isolated preview data) |
| **Auth** | Convex Auth with dev OAuth apps |
| **Mail Send** | Resend test mode (emails logged, not delivered) |
| **Mail Receive** | Not configured |
| **Data** | Isolated test data, auto-cleanup after 5-14 days |

**Testing:**
- Automated CI/CD tests per PR
- Integration tests against isolated backend
- Manual testing of changes before merge
- Breaking changes can be tested safely

**Promotion criteria:**
- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ Code review approved
- ✅ No conflicts with base branch

**Who uses it:** Development team, automated CI/CD

**Key Benefits:**
- Complete isolation per PR (no conflicts with other work)
- Test breaking changes without affecting staging
- Automatic cleanup (no manual teardown needed)
- Replaces need for persistent "dev" environment

---

### 3. Staging (Validation)

**Purpose:** Pre-production validation, mirrors production as closely as possible

| Aspect | Configuration |
|--------|--------------|
| **Frontend** | Vercel (deploy from `staging` branch) |
| **Frontend URL** | `https://artifactreview-early.xyz` |
| **Convex** | Hosted cloud (`staging` project) |
| **Convex URL** | Auto-generated `*.convex.cloud` (e.g., `wise-fox-789.convex.cloud`) |
| **Database** | Convex managed (production-like data) |
| **Auth** | Convex Auth with staging OAuth apps |
| **Mail Send** | Resend live (restricted to verified test recipients) |
| **Mail Receive** | Not configured |
| **Data** | Production-like dataset (anonymized if needed) |

**Testing:**
- End-to-end testing
- Performance testing
- UAT (User Acceptance Testing)
- Security testing
- Load testing
- Manual QA

**Promotion criteria:**
- ✅ All preview deployment tests pass
- ✅ E2E tests pass
- ✅ Performance benchmarks met
- ✅ Security scan clean
- ✅ Product/stakeholder approval
- ✅ Deployment runbook tested

**Who uses it:** QA team, product managers, stakeholders

---

### 4. Production

**Purpose:** Live customer-facing environment

| Aspect | Configuration |
|--------|--------------|
| **Frontend** | Vercel (deploy from `main` branch) |
| **Frontend URL** | `https://artifactreview.com` |
| **Convex** | Hosted cloud (`prod` project) |
| **Convex URL** | Auto-generated `*.convex.cloud` (e.g., `brave-lion-012.convex.cloud`) |
| **Database** | Convex managed (production data with automated backups) |
| **Auth** | Convex Auth with production OAuth apps |
| **Mail Send** | Resend live (verified domain, all users) |
| **Mail Receive** | Not configured (may add for reply-to-comment feature) |
| **Data** | Real customer data |
| **Monitoring** | Full observability (errors, performance, usage) |

**Deployment:**
- Automated via CI/CD with manual approval gate
- Blue-green or rolling deployment
- Database migrations run first
- Rollback plan ready

**Promotion criteria:**
- ✅ Staging validation complete
- ✅ Deployment checklist complete
- ✅ Rollback plan documented
- ✅ On-call engineer identified
- ✅ Stakeholder approval

**Who uses it:** Customers, support team monitors

---

## Environment Configuration

### Convex Deployments

#### Local Dev (Self-hosted Docker)
Runs entirely on your local machine via Docker Compose.
```bash
docker compose up -d
npx convex dev --once
```
**Benefits:** Absolute isolation, offline-capable, zero Convex cloud usage.

#### Cloud Environments (Preview, Staging, Production)
Cloud deployments for testing and production.

- **Local Dev** uses a self-hosted Docker container with a local SQLite database.
- **Preview/Staging/Prod** environments use Convex's managed cloud infrastructure.
- Each cloud environment gets its own `*.convex.cloud` URL.
- Preview deployments are automatically created per PR via Vercel's Convex integration.
- Convex Managed handles: scaling, backups, monitoring, load balancing in the cloud.

**Environment variables** managed per deployment:
```bash
# Local: No Resend key needed (uses Mailpit)
# Convex backend config points to localhost:1025 for SMTP

# Preview: Inherits from staging by default (automatic via Vercel)

# Staging
npx convex env set RESEND_API_KEY=re_staging_xxx --project staging
npx convex env set RESEND_TEST_MODE=false --project staging
npx convex env set RESEND_ALLOWED_RECIPIENTS=test@example.com,qa@example.com --project staging

# Production
npx convex env set RESEND_API_KEY=re_prod_xxx --project prod
npx convex env set RESEND_TEST_MODE=false --project prod
```

### Authentication Configuration

**Provider:** Convex Auth (email-based user identification for migration flexibility)

| Environment | OAuth Apps | OAuth Redirect URLs | Auth Method |
|-------------|------------|---------------------|-------------|
| **Local** | Dev credentials (Google, GitHub) | `http://localhost:3000/auth/callback` | Magic links (Mailpit) + OAuth |
| **Preview** | Dev credentials (Google, GitHub) | Auto-generated Vercel URL | Magic links (Resend test) + OAuth |
| **Staging** | Staging credentials (Google, GitHub) | `https://artifactreview-early.xyz/auth/callback` | Magic links (Resend live) + OAuth |
| **Production** | Production credentials (Google, GitHub) | `https://artifactreview.com/auth/callback` | Magic links (Resend live) + OAuth |

**OAuth Apps Setup:**
- Create separate OAuth applications for dev/preview, staging, and production in:
  - Google Cloud Console (for Google OAuth)
  - GitHub Developer Settings (for GitHub OAuth)
- Each OAuth app must have the corresponding redirect URL registered
- Preview deployments can share dev credentials or use wildcard domains
- Store OAuth client IDs and secrets in Convex environment variables per project

### Email Configuration (Send & Receive)

#### Mail Send (Outbound)

| Environment | Provider | API Key | Mode | Delivery | Purpose |
|-------------|----------|---------|------|----------|---------|
| **Local** | Mailpit (Docker) | N/A | Capture | No delivery (localhost:8025 UI) | Magic links, dev testing |
| **Preview** | Resend | Test key | Test mode | No delivery (logs only) | CI/CD testing, PR validation |
| **Staging** | Resend | Staging key | Live | Restricted (verified test emails) | QA, pre-prod validation |
| **Production** | Resend | Production key | Live | All users | Customer magic links, notifications |

**Mailpit Setup (Local):**
```bash
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit
# SMTP: localhost:1025
# Web UI: http://localhost:8025
```

**Resend Domain Configuration:**
- Local: Not used (Mailpit)
- Preview: `artifactreview-early.xyz` (test mode, no SPF/DKIM needed)
- Staging: `artifactreview-early.xyz` (verify domain, add SPF/DKIM)
- Production: `artifactreview.com` (verify domain, add SPF/DKIM)

#### Mail Receive (Inbound)

| Environment | Status | Notes |
|-------------|--------|-------|
| **All** | Not configured for MVP | Future: Reply-to-comment via email using Resend inbound webhooks |

**Future consideration:** If reply-to-comment via email is added:
- Resend supports inbound email via webhooks
- Configure different webhook endpoints per environment
- Example: `reply+{commentId}@yourdomain.com` → Convex HTTP action

---

## Compatibility Verification

Before deploying to any environment, verify these compatibility checks:

### ✅ Convex + Email Integration

| Check | Local | Preview | Staging | Production |
|-------|-------|---------|---------|------------|
| Convex backend can send email | ✅ Via Mailpit | ✅ Via Resend test | ✅ Via Resend live | ✅ Via Resend live |
| Magic links work | ✅ Captured in Mailpit | ✅ Logged (not sent) | ✅ Sent to test emails | ✅ Sent to all users |
| OAuth redirects match | ✅ localhost | ✅ Vercel preview URL | ✅ artifactreview-early.xyz | ✅ artifactreview.com |
| Email domain verified | N/A | N/A (test mode) | ✅ Required | ✅ Required |

### ✅ Auth + Domain Integration

| Check | Requirement |
|-------|-------------|
| OAuth redirect URLs registered | ✅ Must match frontend domain per environment |
| Convex Auth configuration | ✅ Same auth.ts code works across all environments |
| Email-based user linking | ✅ Works identically in all environments |
| Migration path preserved | ✅ Email identifier consistent across environments |

### ✅ Data Isolation

| Environment | Convex Project | Database | Email Recipients |
|-------------|----------------|----------|------------------|
| Local | Separate per developer | Isolated | Mailpit (local only) |
| Preview | Isolated per PR | Isolated preview data | Test mode (no delivery) |
| Staging | Shared `staging` | Staging data | Restricted list |
| Production | Shared `prod` | Production data | All users |

---

## Promotion Process

### Preview → Staging

**Trigger:** PR approved and tests passing

**Process:**
1. Merge PR to `staging` branch
2. Vercel automatically deploys to `artifactreview-early.xyz`
3. Run E2E tests against staging
4. Notify QA team for testing
5. Preview deployment is automatically cleaned up

**Rollback:** Revert merge commit, redeploy previous staging version

---

### Staging → Production

**Trigger:** Staging validation complete

**Process:**
1. **Pre-deployment checklist:**
   - [ ] All tests passing
   - [ ] Performance benchmarks met
   - [ ] Security scan complete
   - [ ] Stakeholder approval obtained
   - [ ] Database migrations prepared
   - [ ] Rollback plan documented
   - [ ] On-call engineer assigned

2. **Deployment:**
   - Tag release: `git tag vX.Y.Z`
   - Run database migrations (if any)
   - Deploy: `npx convex deploy --project prod`
   - Verify deployment health
   - Monitor error rates for 30 minutes

3. **Post-deployment:**
   - Smoke tests
   - Monitor dashboards
   - Update status page if needed
   - Team notification

**Rollback:**
- Quick: Redeploy previous production version
- Database changes: Requires rollback script (test in staging first)

---

## CI/CD Pipeline

### Pull Request → Preview Deployment

```yaml
on: pull_request
steps:
  - Run unit tests (Vitest)
  - Run linters
  - Build application
  - Vercel automatically deploys preview (frontend + Convex preview backend)
  - Run integration tests against preview URL
  - Post preview URL to PR comments
```

### Merge to staging → Staging

```yaml
on: push (staging branch)
steps:
  - Run full test suite
  - Vercel deploys to artifactreview-early.xyz
  - Run E2E tests
  - Run smoke tests
  - Notify QA team
```

### Manual Approval → Production

```yaml
on: workflow_dispatch (manual approval required)
steps:
  - Pre-deployment checklist verification
  - Database migrations (if any)
  - Deploy to production: npx convex deploy --project prod
  - Smoke tests
  - Monitor error rates
  - Notify team
```

---

## Data Management

### Local Dev
- Seed scripts to create test data
- Can be reset/wiped freely
- No real customer data

### Preview Deployments
- Isolated test data per PR
- Automatically cleaned up after PR is closed/merged
- No real customer data
- Auto-expires after 5-14 days

### Staging
- Production-like dataset
- Anonymized customer data (if using production data)
- OR synthetic data that mirrors production patterns
- Refreshed from production periodically

### Production
- Real customer data
- Regular backups (Convex handles this)
- No direct data access (use read-only queries via Convex dashboard)

---

## Monitoring & Observability

### Development Environments
- Basic error logging
- Console logs sufficient

### Staging
- Error tracking (same as production)
- Performance monitoring
- Synthetic monitoring

### Production
- **Error tracking:** Sentry or similar
- **Performance monitoring:** Web vitals, API latency
- **Uptime monitoring:** Ping service
- **User analytics:** Plausible or similar
- **Convex dashboard:** Query performance, function errors

---

## Security Considerations

### Secrets Management

**Never commit:**
- API keys
- OAuth client secrets
- Database credentials

**Use:**
- `npx convex env set` for backend secrets
- Environment variables for frontend (via `.env.local`)
- Different secrets per environment

### Access Control

| Environment | Access |
|-------------|--------|
| Local | Individual developer only |
| Preview | PR author + reviewers (via Vercel preview URL) |
| Staging | Developers + QA + Product |
| Production | Limited production access, audit logs |

---

## Cost Optimization

| Environment | Resources | Monthly Cost Estimate |
|-------------|-----------|----------------------|
| **Local** | Developer machine + Mailpit | Free |
| **Preview** | Vercel (included in Pro) + Convex preview | Included in Vercel Pro + Convex free tier |
| **Staging** | Vercel Pro + Convex + Resend | Shared with production Vercel plan |
| **Production** | Vercel Pro + Convex + Resend | ~$20 (Vercel Pro) + Convex $25/mo (Professional) + Resend (may need paid) |

### Pricing Breakdown

**Vercel:**
- **Cost:** $20/user/month (Pro plan, required for commercial use)
- **Includes:** Unlimited deployments, preview deployments, 100GB bandwidth
- **Note:** Single Pro plan can cover multiple environments (dev/staging/prod) via branch deployments

**Convex:**
- **Free tier:** Covers local dev + likely covers hosted dev/staging
- **Production:** Usage-based pricing as you scale
- **Cost:** Typically $0-50/month for MVP/early growth

**Resend:**
- **Plan:** Pro ($20/month)
- **Includes:** 50,000 emails/month, dedicated IP options, and higher rate limits.
- **Usage:** Covers all environments (Dev/Staging/Prod). Local Dev is bypassed via Mailpit.

**Convex File Storage (MVP):**
- **Included in Professional plan:** 100GB storage, 50GB bandwidth/month
- **Cost:** $25/month fixed (no overages within limits)
- **Migration trigger:** Bandwidth consistently >40GB/month → migrate to Cloudflare R2
- **See:** [ADR 0002](./decisions/0002-html-artifact-storage.md) for full storage strategy

### Total MVP Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| Vercel Pro | $20 |
| Convex Professional | $25 |
| Resend Pro | $20 |
| **Total** | **~$65/month** |

**As you scale:**
- Convex: Fixed $25/month until you exceed Professional plan limits
- Resend: May need $20/month paid tier (50K emails)
- Storage migration: Move to Cloudflare R2 when bandwidth >40GB/month (saves ~$40/month at scale)
- Vercel: $20/month stays flat (bandwidth overages rare)

---

## References

### Frontend Hosting
- [Vercel Docs](https://vercel.com/docs)
- [Vercel + Convex Integration](https://docs.convex.dev/production/hosting/vercel)
- [Vercel Pricing](https://vercel.com/pricing)
- [Netlify + Convex Integration](https://docs.convex.dev/production/hosting/netlify) (alternative)

### Backend (Convex)
- [Convex Deployments](https://docs.convex.dev/production/hosting)
- [Convex Local Deployments](https://docs.convex.dev/cli/local-deployments) (how local mode works)
- [Convex Self-Hosting Docs](https://docs.convex.dev/self-hosting) (why we chose hosted over self-hosted)
- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables)

### Email & Testing
- [Resend Docs](https://resend.com/docs)
- [Resend Inbound Email](https://resend.com/docs/dashboard/emails/inbound-emails) (future reference)
- [Mailpit](https://mailpit.axllent.org/) (local email testing)

### File Storage
- [Convex File Storage](https://docs.convex.dev/file-storage) (MVP storage solution)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/) (future migration option)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)

### Project Architecture
- [ADR 0001: Authentication Provider](./decisions/0001-authentication-provider.md) (auth + email + testing strategy)
- [ADR 0002: HTML Artifact Storage](./decisions/0002-html-artifact-storage.md) (Convex File Storage → R2 migration strategy)
- [ADR 0003: Deployment & Hosting Strategy](./decisions/0003-deployment-hosting-strategy.md) (Vercel + direct Convex account)
