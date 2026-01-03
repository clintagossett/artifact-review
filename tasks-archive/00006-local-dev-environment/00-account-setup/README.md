# Subtask 00: Account Setup (JIT-Staged)

**Parent Task:** 00006-local-dev-environment
**Status:** In Progress

## Overview

Account and service setup organized Just-In-Time (JIT) by Task 6 phase. Only set up what's needed for each step—no upfront bulk configuration.

---

## Phase 1: Step 1 Prerequisites (Anonymous Auth - Local Dev)

**What you need to run Step 1 locally:**

### Convex Account
- [x] Create account at [convex.dev](https://convex.dev)
- [x] Run `npx convex login` to authenticate CLI
- [x] Run `npx convex dev` to provision deployment (mild-ptarmigan-109)
- [x] Set `NEXT_PUBLIC_CONVEX_URL` environment variable in dashboard

**That's it for Step 1.** Anonymous auth only needs Convex.

---

## Phase 2: Step 2 Prerequisites (Magic Links - Local Dev)

**What you need to add email/magic links locally:**

### Docker (for Mailpit)
- [ ] Install Docker Desktop if not present
- [ ] Verify with `docker --version`

### Mailpit (Local Email Capture)
- [ ] Start Mailpit container:
  ```bash
  docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
  ```
- [ ] Verify UI at http://localhost:8025
- [ ] Configure `.env.local`:
  ```
  SMTP_HOST=localhost
  SMTP_PORT=1025
  ```

---

## Phase 3: Hosted Dev Prerequisites (Vercel + Resend)

**What you need to deploy to hosted dev environment:**

### Vercel Account
- [ ] Create account at [vercel.com](https://vercel.com)
- [ ] Install CLI: `npm i -g vercel`
- [ ] Run `vercel login`
- [ ] Link project: `vercel link`

### Resend Account (Transactional Email)
- [ ] Create account at [resend.com](https://resend.com)
- [ ] Generate API key
- [ ] Add to Convex environment:
  ```bash
  npx convex env set RESEND_API_KEY <your-key>
  ```
- [ ] Verify domain (or use test mode)

### GitHub (if not already connected)
- [ ] Ensure repo is on GitHub
- [ ] Connect Vercel to GitHub repo for auto-deploys

---

## Phase 4: Staging Prerequisites (Future)

**Deferred until Step 2 hosted dev is validated.**

- [ ] Configure staging Convex deployment
- [ ] Set up staging Vercel environment
- [ ] Separate Resend API key for staging

---

## Quick Reference

| Phase | Step | Services Needed |
|-------|------|-----------------|
| 1 | Step 1 Local | Convex |
| 2 | Step 2 Local | + Docker, Mailpit |
| 3 | Hosted Dev | + Vercel, Resend, GitHub |
| 4 | Staging | Separate env configs |

---

## See Also

- [Full Account Checklist](/docs/setup/account-checklist.md) - Comprehensive setup guide
- [Task 6 README](../README.md) - Parent task details
