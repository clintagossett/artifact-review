# Deployment Environments & SDLC

**Status:** Active
**Last Updated:** 2024-12-24

## Overview

This project uses a 4-tier environment strategy to ensure quality and stability before production deployment.

```
Local Dev → Hosted Dev (Integration) → Staging (Validation) → Production
```

## Environment Details

### 1. Local Development

**Purpose:** Individual developer testing and feature development

| Aspect | Configuration |
|--------|--------------|
| **Convex** | Local dev server (`npx convex dev`) |
| **Database** | Separate dev deployment |
| **Auth** | Convex Auth with test OAuth apps |
| **Email** | Mailpit (Docker) - no real emails sent |
| **Domain** | `localhost:5173` (or similar) |
| **Data** | Seed data, can be reset freely |

**Testing:**
- Unit tests run locally with Vitest
- Manual feature testing
- Quick iteration cycle

**Who uses it:** Individual developers

---

### 2. Hosted Dev (Integration)

**Purpose:** Integration testing with real backend, shared team environment

| Aspect | Configuration |
|--------|--------------|
| **Convex** | `dev` deployment (e.g., `happy-horse-123.convex.cloud`) |
| **Database** | Shared dev database |
| **Auth** | Convex Auth with dev OAuth apps |
| **Email** | Resend test mode OR Mailpit hosted |
| **Domain** | `dev.yourdomain.com` |
| **Data** | Test data, refreshed periodically |

**Testing:**
- Automated CI/CD tests
- Integration tests across services
- PR preview deployments
- Team manual testing

**Promotion criteria:**
- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ Code review approved
- ✅ Feature functionally complete

**Who uses it:** Development team, automated CI/CD

---

### 3. Staging (Validation)

**Purpose:** Pre-production validation, mirrors production as closely as possible

| Aspect | Configuration |
|--------|--------------|
| **Convex** | `staging` deployment |
| **Database** | Staging database (production-like data) |
| **Auth** | Convex Auth with staging OAuth apps |
| **Email** | Real Resend, limited to verified test emails |
| **Domain** | `staging.yourdomain.com` |
| **Data** | Production-like dataset (anonymized if needed) |

**Testing:**
- End-to-end testing
- Performance testing
- UAT (User Acceptance Testing)
- Security testing
- Load testing
- Manual QA

**Promotion criteria:**
- ✅ All integration tests pass
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
| **Convex** | `production` deployment |
| **Database** | Production database |
| **Auth** | Convex Auth with production OAuth apps |
| **Email** | Resend production (verified domain) |
| **Domain** | `app.yourdomain.com` or `yourdomain.com` |
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

Each environment uses a separate Convex deployment:

```bash
# Local
npx convex dev

# Hosted Dev
npx convex deploy --project dev

# Staging
npx convex deploy --project staging

# Production
npx convex deploy --project prod
```

**Environment variables** managed per deployment:
```bash
# Set per environment
npx convex env set RESEND_API_KEY=xxx --project dev
npx convex env set RESEND_API_KEY=yyy --project staging
npx convex env set RESEND_API_KEY=zzz --project prod
```

### Authentication Configuration

| Environment | OAuth Apps | Email Testing |
|-------------|------------|---------------|
| Local | Dev OAuth credentials | Mailpit (localhost:8025) |
| Hosted Dev | Dev OAuth credentials | Resend test mode |
| Staging | Staging OAuth credentials | Resend (limited recipients) |
| Production | Prod OAuth credentials | Resend (all users) |

**OAuth Redirect URLs** must be registered per environment:
- Local: `http://localhost:5173/auth/callback`
- Dev: `https://dev.yourdomain.com/auth/callback`
- Staging: `https://staging.yourdomain.com/auth/callback`
- Production: `https://app.yourdomain.com/auth/callback`

### Email Provider (Resend)

| Environment | API Key | Mode | Recipients |
|-------------|---------|------|------------|
| Local | N/A | Mailpit | Captured locally |
| Hosted Dev | Test key | Test mode | Logs only |
| Staging | Staging key | Live, restricted | Verified emails only |
| Production | Prod key | Live | All users |

---

## Promotion Process

### Dev → Staging

**Trigger:** Feature complete and tested in dev

**Process:**
1. Create release branch: `release/vX.Y.Z`
2. Run full test suite
3. Deploy to staging: `npx convex deploy --project staging`
4. Run E2E tests against staging
5. Notify QA team for testing

**Rollback:** Redeploy previous staging version

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

### Pull Request → Hosted Dev

```yaml
on: pull_request
steps:
  - Run unit tests (Vitest)
  - Run linters
  - Build application
  - Deploy to preview environment (Convex preview deployment)
  - Run integration tests
```

### Merge to main → Hosted Dev

```yaml
on: push (main branch)
steps:
  - Run full test suite
  - Deploy to hosted dev: npx convex deploy --project dev
  - Run smoke tests
  - Notify team
```

### Manual Trigger → Staging

```yaml
on: workflow_dispatch
steps:
  - Create release branch
  - Run full test suite
  - Deploy to staging: npx convex deploy --project staging
  - Run E2E tests
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

### Hosted Dev
- Test data refreshed periodically (weekly/monthly)
- Shared across team
- No real customer data

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
| Hosted Dev | All developers |
| Staging | Developers + QA + Product |
| Production | Limited production access, audit logs |

---

## Cost Optimization

| Environment | Resources | Cost Strategy |
|-------------|-----------|---------------|
| Local | Developer machine | Free |
| Hosted Dev | Convex free/paid tier | Minimal, can share resources |
| Staging | Similar to production | Can be smaller scale (fewer replicas) |
| Production | Full production resources | Optimized for performance |

**Convex Pricing:** Free tier covers local dev. Hosted dev, staging, and production each need separate deployments (may incur costs at scale).

**Resend Pricing:** Free tier (3K emails/month) likely covers dev + staging. Production may need paid tier.

---

## References

- [Convex Deployments](https://docs.convex.dev/production/hosting)
- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables)
- [ADR 0001: Authentication Provider](./decisions/0001-authentication-provider.md) (testing strategy per environment)
