# Task 00006: Local & Hosted Dev Environment Setup

**GitHub Issue:** #6

---

## Prerequisites

Before starting this task, complete the necessary account setup for each step:

**For Step 1 (Anonymous Auth - Local):**
- Follow [Account Setup Phase 1](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/setup/account-checklist.md#phase-1-local-development---anonymous-auth)
- You need: GitHub account, Convex account, Node.js, direnv
- Setup time: 15-20 minutes
- **Do NOT set up:** Vercel, Resend, OAuth, domains, or Mailpit yet

**For Step 2 (Magic Links - Local):**
- Follow [Account Setup Phase 2](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/setup/account-checklist.md#phase-2-local-development---magic-links)
- You need: Docker + Mailpit
- Setup time: 10 minutes
- **Do NOT set up:** Vercel, Resend, OAuth, or domains yet

**For Hosted Deployment (Optional):**
- Follow [Account Setup Phase 3](/Users/clintgossett/Documents/personal/personal projects/html-review-poc/docs/setup/account-checklist.md#phase-3-hosted-development)
- You need: Vercel account, Resend account (test mode)
- Setup time: 30-45 minutes

**Key Principle:** Only set up what you need for the current step. This is a Just-In-Time (JIT) approach.

---

## Resume (Start Here)

**Last Updated:** 2025-12-25
**Current Status:** Step 1 Implementation Complete - Ready for User Testing

### Step 1: Anonymous Authentication - IMPLEMENTED

**What was done:**
- Next.js 14 app created in `/app` directory
- Convex backend configured with anonymous auth
- Landing page with "Start Using Artifact Review" button
- Dashboard showing anonymous session state
- Tests written for authentication flow

**What you need to do:**
1. Run `npx convex login` (authenticate with Convex)
2. Run `npx convex dev` (initialize project, keep running)
3. In new terminal: `npm run dev` (start Next.js)
4. Visit http://localhost:3000 and test the flow

**See:** `/tasks/00006-local-dev-environment/step-1-implementation-summary.md` for full details
**Setup Guide:** `/app/README.md`

### What This Task Is

Set up working local and hosted development environments by building **two simple authentication flows** that prove the system works end-to-end across all deployment tiers:

1. **Step 1: Anonymous login** - Users can start using the app immediately, no email required
2. **Step 2: Magic link login** - Users can provide email to enable collaboration features

**This is NOT about building a polished UI.** It's about proving the infrastructure works: local dev → hosted dev → staging.

---

## Objective

Validate the complete development environment setup through **progressive authentication flows**:

- **Step 1** proves anonymous auth works (Convex Auth)
- **Step 2** proves email integration works (Convex Auth + Resend)
- Both steps validate the deployment pipeline across environments

### What We're Building

A minimal signup/dashboard experience:
- **Simple forms** (NOT the full Figma landing page design)
- **Basic validation** that auth works
- **Environment promotion** through the pipeline

### What We're NOT Building

- Polished UI matching the Figma designs
- Full landing page experience
- Complete feature set
- Production-ready flows

Those come later. This task is infrastructure validation.

---

## Architecture Constraints

Per existing ADRs:

| Component | Technology | ADR Reference |
|-----------|------------|---------------|
| Frontend | Next.js 14 + ShadCN UI | ADR 0006 |
| Backend | Convex | ADR 0003 |
| Auth | Convex Auth (anonymous + magic links) | ADR 0001 |
| Email (local) | Mailpit | ADR 0004 |
| Email (hosted) | Resend | ADR 0004 |
| Deployment | Vercel | ADR 0003 |

---

## Step 1: Anonymous Authentication

**Goal:** Users can access the app immediately without providing any credentials.

### What Success Looks Like

1. User visits the app
2. Clicks "Start Using Artifact Review"
3. Gets an anonymous session automatically
4. Dashboard shows they're in anonymous mode

### Implementation Checklist

- [x] Initialize Next.js 14 project with App Router
- [x] Install and configure Convex
- [x] Install ShadCN UI components (button, card only)
- [x] Configure Convex Auth with Anonymous provider
- [x] Create minimal schema with `isAnonymous` flag
- [x] Add ConvexAuthProvider to root layout
- [x] Create minimal dashboard that shows auth state
- [x] Create "Start Using Artifact Review" button that triggers anonymous auth

### Validation Points

**Local Development:**
- [ ] Anonymous auth works at `http://localhost:3000`
- [ ] No Convex connection errors in console
- [ ] Session persists across page refreshes
- [ ] Sign out creates new anonymous session

**Hosted Dev (Vercel):**
- [ ] Deploy to Vercel
- [ ] Anonymous auth works on `*.vercel.app`
- [ ] Convex connection works from hosted environment

**Staging:**
- [ ] Promote to staging environment
- [ ] Same validation as hosted dev

---

## Step 2: Magic Link Authentication

**Goal:** Users can provide email to unlock collaboration features.

### What Success Looks Like

1. Anonymous user clicks "Enable Collaboration"
2. Enters email address
3. Receives magic link (Mailpit locally, Resend hosted)
4. Clicks link → email added to their session
5. Dashboard shows "You're signed in (email verified)"

### Implementation Checklist

- [ ] Install Resend SDK
- [ ] Add email input form to dashboard
- [ ] Update Convex Auth to include Email/Resend provider
- [ ] Configure Mailpit for local email capture (Docker)
- [ ] Create upgrade flow: anonymous → add email → verify

### Validation Points

**Local Development:**
- [ ] Magic link email appears in Mailpit UI (`http://localhost:8025`)
- [ ] Email contains valid link to `http://localhost:3000`
- [ ] Clicking link upgrades session to email-verified
- [ ] Same user ID before/after email addition

**Hosted Dev (Vercel):**
- [ ] Configure Resend test API key in Convex
- [ ] Magic link email logged in Resend dashboard
- [ ] Email verification flow works end-to-end

**Staging:**
- [ ] Same validation as hosted dev
- [ ] Emails use test mode (not delivered to real inboxes)

---

## Environment Setup

### Local Development

**Prerequisites:**
- Node.js 20+
- Docker (for Mailpit)
- Git

**Services:**
```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Convex
npx convex dev

# Terminal 3: Mailpit
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

### Hosted Dev (Vercel)

```bash
vercel --prod
vercel env add NEXT_PUBLIC_CONVEX_URL production
vercel env add CONVEX_DEPLOY_KEY production
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No session created | Verify ConvexAuthProvider wraps app |
| Convex connection error | Check `NEXT_PUBLIC_CONVEX_URL` |
| No email in Mailpit | Verify SMTP env vars (localhost:1025) |
| Magic link 404 | Check `convex/http.ts` has auth routes |

---

## Success Criteria

### Step 1 Complete When:
- [ ] Anonymous auth works in local, hosted dev, and staging
- [ ] Session persists across page refreshes
- [ ] No console errors

### Step 2 Complete When:
- [ ] Magic link flow works in all environments
- [ ] Anonymous session upgrades seamlessly
- [ ] Same user ID before/after email addition

---

## What Comes Next

1. **Task 00007: Basic Artifact Upload** - Prove file storage works
2. **Task 00008: Progressive Disclosure UI** - "Upgrade to enable sharing" prompts
3. **Task 00009: Landing Page** - Build polished UI from Figma

---

## References

- [ADR 0001: Authentication](/docs/architecture/decisions/0001-authentication-provider.md)
- [ADR 0003: Deployment](/docs/architecture/decisions/0003-deployment-hosting-strategy.md)
- [ADR 0004: Email](/docs/architecture/decisions/0004-email-strategy.md)
- [ADR 0006: Frontend Stack](/docs/architecture/decisions/0006-frontend-stack.md)
- [Convex Auth Docs](https://labs.convex.dev/auth)
- [Convex Anonymous Auth](https://labs.convex.dev/auth/config/anonymous)
