# ADR 0004: Email Strategy

**Status:** Accepted
**Date:** 2024-12-24
**Decision Maker:** Clint Gossett

## TL;DR

Use Resend for all transactional email via `@convex-dev/resend` component. Use component `testMode` for safe development awareness. No inbound email for MVP.

## Quick Reference

| Item | Value |
|------|-------|
| **Provider** | Resend |
| **Free tier** | 3,000 emails/month |
| **Paid tier** | $20/month for 50K emails |
| **Local dev** | Mailpit (Docker) |
| **Inbound email** | Not configured (MVP) |

## Decision Drivers (Priority Order)

1. **Convex Auth integration** - Official support for magic links
2. **Generous free tier** - 3K emails covers MVP easily
3. **Modern DX** - Clean API, good documentation
4. **Simple setup** - Easy domain verification, no complex configuration
5. **Cost-effective scaling** - $20/mo for 50K is reasonable

## Related Decisions

- [ADR 0001: Authentication Provider](./0001-authentication-provider.md) - Uses Resend for magic links
- [ADR 0003: Deployment & Hosting Strategy](./0003-deployment-hosting-strategy.md) - Environment-specific email config
- [Deployment Environments](../deployment-environments.md) - Per-environment email setup

## Context

The platform needs email for multiple use cases:

| Use Case | Priority | Description |
|----------|----------|-------------|
| **Magic links** | MVP | Passwordless auth for reviewers |
| **Share invitations** | MVP | Invite reviewers to documents |
| **Comment notifications** | MVP | Alert when someone comments |
| **Digest emails** | Post-MVP | Weekly activity summaries |
| **Inbound email** | Future | Reply-to-comment via email |

## Decision

### Provider: Resend

**Use Resend for all transactional email.**

| Aspect | Details |
|--------|---------|
| **Provider** | Resend |
| **Free tier** | 3,000 emails/month |
| **Paid tier** | $20/month for 50K emails |
| **Integration** | Official Convex Auth support |
| **API style** | Modern REST/SDK |

### Why Resend

| Provider | Free Tier | Convex Support | DX | Verdict |
|----------|-----------|----------------|-----|---------|
| **Resend** | 3K/month | Official integration | Excellent | **Chosen** |
| Postmark | 100/month | Manual setup | Good | Too limited free tier |
| SendGrid | 100/day | Manual setup | Complex | Overly complex |
| AWS SES | Pay-per-use | Manual setup | Poor DX | Too low-level |
| Mailgun | 5K/month (3 months) | Manual setup | Good | Free tier expires |

### Local Development: Mailpit (Docker)

**Use a local Mailpit instance for all local development.**

When running locally via Docker Compose, all emails are routed to Mailpit. This provides an immediate, visual way to verify email content without any external API calls or account requirements.

**Benefits:**
- **Zero external dependencies**: Work offline or without a Resend key.
- **Visual Verification**: Inspect HTML emails in http://localhost:8025.
- **Fast Feedback**: Near-instant capture compared to polling external APIs.

### Environment Configuration

| Environment | Mode | Configuration | Behavior |
|-------------|------|---------------|----------|
| **Local** | Mailpit | `docker compose up` | Captured locally in Mailpit UI |
| **Hosted Dev** | Resend (Live) | `RESEND_TEST_MODE=false` | Real delivery (Verified Domain) |
| **Staging** | Resend (Live) | `RESEND_TEST_MODE=false` | Real delivery |
| **Production** | Resend (Live) | `RESEND_TEST_MODE=false` | Real delivery |

### Resend Configuration

```bash
# Local
npx convex env set RESEND_TEST_MODE=true --project dev

# Hosted Dev
npx convex env set RESEND_TEST_MODE=false --project dev

# Staging
npx convex env set RESEND_TEST_MODE=false --project staging

# Production
npx convex env set RESEND_TEST_MODE=false --project prod
```

### Domain Setup

| Environment | Domain | DNS Required |
|-------------|--------|--------------|
| Local | N/A | No |
| Dev | `dev.yourdomain.com` | No (test mode) |
| Staging | `staging.yourdomain.com` | Yes (SPF/DKIM) |
| Production | `yourdomain.com` | Yes (SPF/DKIM) |

## Email Types

### MVP Email Templates

| Email Type | Trigger | From Address |
|------------|---------|--------------|
| Magic link | User requests login | `auth@yourdomain.com` |
| Share invitation | Creator shares document | `noreply@yourdomain.com` |
| Comment notification | Someone comments | `notifications@yourdomain.com` |

### Post-MVP Email Templates

| Email Type | Trigger | Notes |
|------------|---------|-------|
| Weekly digest | Scheduled | Activity summary |
| Mention notification | @mentioned in comment | Real-time |
| Document published | Creator publishes | Notify reviewers |

### Inbound Email (Future)

**Not configured for MVP.** Future consideration for reply-to-comment:

- Resend supports inbound email via webhooks
- Format: `reply+{commentId}@yourdomain.com`
- Webhook → Convex HTTP action → Create comment

## Consequences

### Positive

- ✅ **Official Convex integration** - Magic links work out of the box
- ✅ **Generous free tier** - 3K emails covers MVP + early growth
- ✅ **Simple local testing** - Resend Test Mode logs everything in the dashboard
- ✅ **Modern API** - Clean SDK, good TypeScript support
- ✅ **Reasonable scaling** - $20/mo for 50K is cost-effective

### Negative

- ⚠️ **Vendor lock-in** - Resend-specific API (mitigated by simple API)
- ⚠️ **No inbound for MVP** - Reply-to-comment requires future work
- ⚠️ **Domain verification required** - SPF/DKIM setup for staging/prod

## Alternatives Considered

### Alt 1: Postmark

**Rejected because:**
- ❌ Only 100 emails/month free (vs 3K)
- ✅ Excellent deliverability reputation
- **Verdict:** Free tier too limited for MVP

### Alt 2: SendGrid

**Rejected because:**
- ❌ Complex configuration
- ❌ UI/DX feels dated
- ✅ 100 emails/day free
- **Verdict:** Overcomplicated for our needs

### Alt 3: AWS SES

**Rejected because:**
- ❌ Low-level API, more setup work
- ❌ Sandbox mode requires recipient verification
- ✅ Cheapest at scale
- **Verdict:** Too much ops overhead

### Alt 4: Self-hosted (Mailgun/SMTP)

**Rejected because:**
- ❌ Deliverability challenges
- ❌ IP reputation management
- ❌ More infrastructure to manage
- **Verdict:** Not worth the ops burden

## Cost Projections

| Stage | Emails/Month | Cost |
|-------|--------------|------|
| MVP | ~500 | Free |
| Growth (1K users) | ~5K | $20/mo |
| Scale (10K users) | ~30K | $20/mo |
| Scale (50K users) | ~100K | ~$50/mo |

Resend pricing is predictable and reasonable for transactional email volume.

## References

- [Resend Documentation](https://resend.com/docs)
- [Resend + Convex Auth Integration](https://labs.convex.dev/auth/config/email)
- [Resend Pricing](https://resend.com/pricing)
- [Resend Inbound Email](https://resend.com/docs/dashboard/emails/inbound-emails) (future reference)
