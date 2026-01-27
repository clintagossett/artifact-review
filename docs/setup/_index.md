# Setup Documentation

Documentation for setting up accounts, environments, and access for the Artifact Review project.

## Documents

| Document | Description |
|----------|-------------|
| [local-infrastructure.md](./local-infrastructure.md) | **Start here for local dev** - DNS routing, Convex endpoints, CORS handling |
| [troubleshooting.md](./troubleshooting.md) | **When things break** - Auth issues, JWKS caching, Convex/Docker problems |
| [account-checklist.md](./account-checklist.md) | Complete account setup and configuration guide |

## Quick Links

### For New Team Members

Start here to set up your development environment:
1. [Prerequisites](./account-checklist.md#prerequisites)
2. [Local Development Tools](./account-checklist.md#7-local-development-tools)
3. [Local Environment Setup](./account-checklist.md#1-local-development-setup)
4. [Verification Steps](./account-checklist.md#d-verification-steps)

### For Project Setup (First Time)

Complete guide to setting up all accounts from scratch:
1. [GitHub Account](./account-checklist.md#1-github)
2. [Convex Account](./account-checklist.md#2-convex-backend)
3. [Resend Account](./account-checklist.md#3-resend-email)
4. [Vercel Account](./account-checklist.md#4-vercel-frontend-hosting)
5. [Domain Configuration](./account-checklist.md#5-domain-registrar-namecheap)
6. [OAuth Setup](./account-checklist.md#6-oauth-providers-google--github)

### For Claude Code (Agents)

Agent access configuration:
- [What Agents Need](./account-checklist.md#what-agents-need-access-to)
- [Security Constraints](./account-checklist.md#what-agents-should-not-have)
- [Environment Setup](./account-checklist.md#environment-configuration-for-agents)
- [Agent Workflow](./account-checklist.md#agent-workflow)

## Environment Matrix

| Environment | Frontend | Backend | Email | Access |
|-------------|----------|---------|-------|--------|
| **Local** | localhost:3000 | Convex dev | Mailpit | Individual developer |
| **Hosted Dev** | dev.domain.com | Convex dev project | Resend test | All developers + agents |
| **Staging** | staging.domain.com | Convex staging | Resend live (restricted) | Developers + QA |
| **Production** | app.domain.com | Convex prod | Resend live | Limited access |

## Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Vercel | Pro | $20 |
| Convex | Professional (prod only) | $25 |
| Resend | Free → Pro | $0-20 |
| Domain | Registration | ~$1-2 |
| **Total** | | **~$45-67** |

## Related Documentation

- [ADR 0001: Authentication Provider](../architecture/decisions/0001-authentication-provider.md) - Convex Auth configuration
- [ADR 0003: Deployment & Hosting](../architecture/decisions/0003-deployment-hosting-strategy.md) - Vercel + Convex integration
- [ADR 0004: Email Strategy](../architecture/decisions/0004-email-strategy.md) - Resend configuration
- [ADR 0006: Frontend Stack](../architecture/decisions/0006-frontend-stack.md) - Next.js setup
- [Deployment Environments](../architecture/deployment-environments.md) - Full environment details
- [Task 00006: Local Dev Environment](../../tasks/00006-local-dev-environment/README.md) - Implementation guide

## Support

If you encounter issues:
1. **Check [Troubleshooting Guide](./troubleshooting.md)** - Common auth, Convex, Novu, and Docker issues
2. Review [Verification Steps](./account-checklist.md#d-verification-steps)
3. Consult related ADRs for detailed decisions
4. Open GitHub issue if problem persists
