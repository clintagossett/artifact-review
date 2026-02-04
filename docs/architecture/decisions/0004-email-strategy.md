# ADR 0004: Email Strategy

**Status:** Accepted
**Date:** 2024-12-24
**Decision Maker:** Clint Gossett

## TL;DR

Use Resend for all email (auth, invites, notifications) via `@convex-dev/resend` component. Local dev uses resend-proxy to route emails to Mailpit. No inbound email for MVP.

## Quick Reference

| Item | Value |
|------|-------|
| **Provider** | Resend |
| **Plan** | Pro ($20/month) |
| **Capacity** | 50,000 emails/month |
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
| **Current Plan** | Pro ($20/month) |
| **Capacity** | 50,000 emails/month |
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

| Environment | Infrastructure | Email Strategy | Primary Purpose |
|-------------|----------------|----------------|-----------------|
| **Local Dev** | Docker Compose (Self-hosted Convex + resend-proxy + Mailpit) | **Capture**: resend-proxy intercepts api.resend.com and routes to Mailpit. | Fast, isolated, offline-capable feature development. |
| **Hosted Dev** | Convex Cloud (Dev Project) + Resend | **Live**: Real delivery via Resend API. | Shared preview, integration testing, team collaboration. |
| **Staging** | Convex Cloud (Staging Project) + Resend | **Live**: Real delivery to verified domains. | Final QA and stakeholder sign-off. |
| **Production** | Convex Cloud (Prod Project) + Resend | **Live**: Real delivery to all users. | Live application traffic. |

### Environment Definitions

#### Local Dev ("The Sandboxed Machine")
- **Backend**: Self-hosted Convex running in Docker.
- **Data**: Local SQLite database; isolated per developer.
- **Email**: resend-proxy intercepts api.resend.com traffic and routes to Mailpit. One code path for all environments.
- **Dashboard**: Accessed via `localhost:6791`.

#### Hosted Dev ("The Collective Sandbox")
- **Backend**: Standard Convex Cloud deployment.
- **Data**: Shared development database in the cloud.
- **Email**: Routes through Resend API for real delivery.
- **Dashboard**: Accessed via the Convex web dashboard.

### Domain Setup

| Environment | Domain | DNS Required |
|-------------|--------|--------------|
| Local | N/A | No |
| Dev | `artifactreview-early.xyz` | No (test mode) |
| Staging | `artifactreview-early.xyz` | Yes (SPF/DKIM) |
| Production | `yourdomain.com` | Yes (SPF/DKIM) |

## Email Types

### MVP Email Templates

The application uses **two separate email addresses** for different types of communications:

| Email Type | Trigger | From Address | Environment Variable | Sent Via |
|------------|---------|--------------|---------------------|----------|
| Magic link | User requests login | `auth@artifactreview-early.xyz` (staging)<br/>`auth@artifactreview.com` (prod) | `EMAIL_FROM_AUTH` | Direct Resend (Convex) |
| Password reset | User requests password reset | `auth@artifactreview-early.xyz` (staging)<br/>`auth@artifactreview.com` (prod) | `EMAIL_FROM_AUTH` | Direct Resend (Convex) |
| Share invitation | Creator shares document | `notify@artifactreview-early.xyz` (staging)<br/>`notify@artifactreview.com` (prod) | `EMAIL_FROM_NOTIFICATIONS` | Novu → Resend |
| Comment notification | Someone comments | `notify@artifactreview-early.xyz` (staging)<br/>`notify@artifactreview.com` (prod) | `EMAIL_FROM_NOTIFICATIONS` | Novu → Resend |
| Mention notification | @mentioned in comment | `notify@artifactreview-early.xyz` (staging)<br/>`notify@artifactreview.com` (prod) | `EMAIL_FROM_NOTIFICATIONS` | Novu → Resend |

**Display Name:** All emails use `"Artifact Review"` as the sender name.

**Why two addresses?**
- Separates authentication-critical emails from social/notification emails
- Allows users to filter notifications separately from login emails
- Improves deliverability by segregating email types
- Enables different rate limiting and monitoring per email type
- Authentication emails remain independent of Novu (single point of failure isolation)

### Post-MVP Email Templates

| Email Type | Trigger | Notes |
|------------|---------|-------|
| Weekly digest | Scheduled | Activity summary |
| Mention notification | @mentioned in comment | Real-time |
| Document published | Creator publishes | Notify reviewers |

### Inbound Email (Future)

**Not configured for MVP.** Future consideration for reply-to-comment:

- Resend supports inbound email via webhooks
- Format: `reply+{commentId}@artifactreview.com`
- Webhook → Convex HTTP action → Create comment

## Consequences

### Positive

- ✅ **Official Convex integration** - Magic links work out of the box
- ✅ **Generous free tier** - 3K emails covers MVP + early growth
- ✅ **Simple local testing** - resend-proxy routes to Mailpit automatically
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
| MVP | ~500 | $20/mo (Pro) |
| Growth (1K users) | ~5K | $20/mo |
| Scale (10K users) | ~30K | $20/mo |
| Scale (50K users) | ~100K | ~$50/mo |

Resend pricing is predictable and reasonable for transactional email volume.

## References

- [Resend Documentation](https://resend.com/docs)
- [Resend + Convex Auth Integration](https://labs.convex.dev/auth/config/email)
- [Resend Pricing](https://resend.com/pricing)
- [Resend Inbound Email](https://resend.com/docs/dashboard/emails/inbound-emails) (future reference)
