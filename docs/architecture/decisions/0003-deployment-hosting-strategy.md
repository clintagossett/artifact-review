# ADR 0003: Deployment & Hosting Strategy

**Status:** Accepted
**Date:** 2024-12-24
**Decision Maker:** Clint Gossett

## TL;DR

Use Vercel for frontend hosting with direct Convex account (not Vercel Marketplace). Vercel provides deployment orchestration that coordinates frontend and backend deploys via `npx convex deploy --cmd 'npm run build'`.

## Quick Reference

| Item | Value |
|------|-------|
| **Frontend hosting** | Vercel |
| **Backend** | Convex (direct account) |
| **Orchestration** | Vercel build command |
| **Preview environments** | Vercel + Convex preview deployments |
| **Billing** | Separate (Vercel Pro $20/mo + Convex $25/mo) |

## Decision Drivers (Priority Order)

1. **Deployment orchestration** - Backend deploys before frontend build
2. **Preview environments** - Isolated frontend + backend per PR
3. **Billing transparency** - Direct accounts, no marketplace markup uncertainty
4. **Existing account compatibility** - Use existing Convex account
5. **Next.js optimization** - Vercel is best-in-class for Next.js

## Related Decisions

- [ADR 0001: Authentication Provider](./0001-authentication-provider.md) - Auth config per environment
- [ADR 0002: HTML Artifact Storage](./0002-html-artifact-storage.md) - Storage included in Convex plan
- [Deployment Environments](../deployment-environments.md) - Implementation details

## Context

### The Coordination Problem

Frontend and backend deployments must be coordinated:
- If frontend deploys first with new API calls → errors until backend catches up
- If backend deploys first with breaking changes → old frontend breaks
- Schema changes must match existing data or Convex rejects the deploy

### Convex's Recommendation

Convex explicitly states functions should be **backwards compatible** because users might run old frontend when backend changes. This means:
- Expand types before contracting (add optional field → migrate → make required)
- Keep old function signatures as aliases during transitions
- Multi-step deploys for breaking changes

### Vercel + Convex Integration

Vercel's build command can orchestrate both deploys:

```bash
npx convex deploy --cmd 'npm run build'
```

**Sequence:**
1. `npx convex deploy` pushes backend functions to Convex
2. Convex validates schema against existing data (rejects if incompatible)
3. Sets `CONVEX_URL` environment variable
4. Runs `npm run build` (frontend) pointing to updated backend
5. Vercel deploys the built frontend

This is **coordinated but not atomic** - there's a brief window where old clients might hit new backend. Hence the backwards compatibility requirement.

## Decision

### Use Vercel for Frontend Hosting

**With direct Convex account (NOT Vercel Marketplace integration).**

### Why Vercel

| Benefit | Details |
|---------|---------|
| **Deployment orchestration** | Build command coordinates backend → frontend deploy |
| **Preview deployments** | Each PR gets isolated frontend + Convex backend |
| **Next.js optimized** | SSR, App Router, Server Components, Edge Runtime |
| **Git-based workflow** | Auto-deploy on push to branches |
| **Official Convex support** | First-class integration guide |

### Why Direct Convex Account (Not Marketplace)

| Concern | Marketplace | Direct Account |
|---------|-------------|----------------|
| **Billing** | Through Vercel (unclear markup) | Direct to Convex (transparent) |
| **Existing account** | Creates new Convex team | Use existing account |
| **Control** | Vercel manages | Full control |
| **Orchestration** | Same | Same |
| **Preview deploys** | Same | Same |

The Marketplace integration provides convenience but creates a separate Convex team and routes billing through Vercel. With a direct account, you get the same orchestration benefits via the build command while maintaining billing transparency and using your existing Convex account.

### Configuration

**Vercel Environment Variables:**
```
CONVEX_DEPLOY_KEY=prod:xxxxx  # From Convex dashboard
```

**Vercel Build Command Override:**
```bash
npx convex deploy --cmd 'npm run build'
```

**Branch Deployments:**
| Branch | Environment | Infrastructure | Domain |
|--------|-------------|----------------|--------|
| `N/A` | Local Dev | Docker Compose (Local) | `localhost:3000` |
| `dev` | Hosted Dev | Convex Cloud (Dev) | `dev.yourdomain.com` |
| `staging` | Staging | Convex Cloud (Staging) | `staging.yourdomain.com` |
| `main` | Production | Convex Cloud (Prod) | `app.yourdomain.com` |
| PR branches | Preview | Convex Preview | Auto-generated Vercel URLs |

## Deployment Workflow

### Standard Deploy (Non-Breaking Changes)

```
git push origin main
    ↓
Vercel triggers build
    ↓
npx convex deploy (backend)
    ↓
Convex validates schema ✓
    ↓
npm run build (frontend with new CONVEX_URL)
    ↓
Vercel deploys frontend
    ↓
Done
```

### Breaking Changes (Multi-Step)

**Example: Adding a required field**

```
Step 1: Deploy schema with optional field
    git push (schema: field?: string)
    ↓
Step 2: Run migration to populate field
    npx convex run migrations:addField
    ↓
Step 3: Deploy schema with required field
    git push (schema: field: string)
```

### Preview Deployments

Each PR automatically gets:
- Vercel preview URL (`project-git-branch-user.vercel.app`)
- Isolated Convex preview backend
- Auto-cleanup after 5-14 days

This allows testing breaking changes without affecting production.

### Email Content SDLC

Email templates and content follow the same deployment pipeline:

**Where email templates live:**
- Email templates are Convex functions (actions) that generate and send emails
- Templates are code, versioned in git alongside the application
- Deployed with `npx convex deploy` as part of the standard flow

**Testing email content per environment:**

| Environment | Backend | How to Test | What Happens |
|-------------|---------|-------------|--------------|
| **Local Dev** | Docker | Trigger email action | Captured in Mailpit (localhost:8025) |
| **Hosted Dev** | Cloud | Trigger email action | Resend (Test Mode) logged in Dashboard |
| **Staging** | Cloud | Trigger email action | Sent to restricted recipients only |
| **Production** | Cloud | Trigger email action | Sent to actual users |

**Email preview workflow:**
```
1. Edit email template in code
    ↓
2. Test locally → View in Mailpit UI
    ↓
3. Push PR → Preview deployment uses Resend test mode
    ↓
4. Merge to staging → Test with real delivery to QA emails
    ↓
5. Merge to main → Production emails active
```

**Key points:**
- No separate email template management system needed
- Email changes deploy atomically with the code that triggers them
- Mailpit provides visual preview without sending real emails
- Staging allows testing actual delivery before production

**See also:** [ADR 0004: Email Strategy](./0004-email-strategy.md) for provider details

## Consequences

### Positive

- ✅ **Coordinated deploys** - Backend before frontend, correct order
- ✅ **Single trigger** - Git push deploys both
- ✅ **Preview environments** - Isolated testing per PR
- ✅ **Rollback together** - Vercel rollback redeploys both
- ✅ **Schema validation** - Convex rejects incompatible deploys
- ✅ **Billing transparency** - Direct accounts, known costs
- ✅ **Existing account** - No new Convex team required

### Negative

- ⚠️ **Not truly atomic** - Brief window where old clients hit new backend
- ⚠️ **Backwards compatibility required** - Must design for old + new clients
- ⚠️ **Multi-step breaking changes** - More complex deploy process
- ⚠️ **Two billing relationships** - Vercel + Convex separately (but transparent)

### Mitigations

| Risk | Mitigation |
|------|------------|
| Old client + new backend | Design backwards-compatible APIs |
| Breaking schema changes | Multi-step deploys with migrations |
| Deploy failures | Convex rejects incompatible schemas before breaking anything |
| Rollback complexity | Vercel rollback + Convex deployment history |

## Alternatives Considered

### Alt 1: Vercel Marketplace Integration

**Approach:** Provision Convex through Vercel Marketplace

**Rejected because:**
- Creates separate Convex team (can't use existing account)
- Billing through Vercel (unclear if markup exists)
- Same orchestration available via build command
- Less control over Convex project settings

### Alt 2: Netlify + Convex

**Approach:** Use Netlify for frontend hosting

**Considered but not chosen:**
- ✅ Official Convex integration guide exists
- ✅ Free tier allows commercial use
- ❌ Less optimized for Next.js than Vercel
- ❌ Preview deployments require more configuration
- **Verdict:** Valid alternative, but Vercel better for Next.js

### Alt 3: Cloudflare Pages + Convex

**Approach:** Use Cloudflare Pages for frontend

**Rejected because:**
- ❌ No official Convex integration (custom setup required)
- ❌ Less mature Next.js support
- ✅ Best free tier (unlimited bandwidth)
- **Verdict:** More effort for less DX benefit

### Alt 4: Manual Orchestration (GitHub Actions)

**Approach:** Custom CI/CD pipeline deploying backend then frontend

**Rejected because:**
- ❌ Must build orchestration logic ourselves
- ❌ Preview environments require significant setup
- ❌ More maintenance burden
- ✅ Full control over deploy process
- **Verdict:** Reinventing what Vercel provides

## Cost Impact

| Component | Monthly Cost |
|-----------|-------------|
| Vercel Pro | $20 |
| Convex Professional | $25 |
| **Total** | **$45** |

Separate billing provides transparency. No hidden marketplace fees.

## References

- [Using Convex with Vercel | Convex Developer Hub](https://docs.convex.dev/production/hosting/vercel)
- [Preview Deployments | Convex Developer Hub](https://docs.convex.dev/production/hosting/preview-deployments)
- [Intro to Migrations | Convex Stack](https://stack.convex.dev/intro-to-migrations)
- [Vercel + Convex Marketplace Announcement](https://vercel.com/changelog/convex-joins-the-vercel-marketplace)
