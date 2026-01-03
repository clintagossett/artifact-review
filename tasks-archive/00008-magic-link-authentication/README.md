# Task 00008: Magic Link Authentication

**GitHub Issue:** #8

---

## Overview

Implement passwordless email authentication using magic links. Users can sign in by receiving a verification link via email without needing a password.

**Status:** Planning

**Originally:** Task 6 Step 2 (deferred to prioritize password auth in Task 7)

---

## Objective

Add magic link authentication as a complementary sign-in method alongside password authentication. Users can request a login link via email, providing a secure, passwordless authentication experience.

## What Success Looks Like

1. User enters email address in sign-in form
2. System sends magic link email (Mailpit locally, Resend hosted)
3. User clicks link in email
4. User is authenticated and redirected to dashboard
5. Session persists across page refreshes

**Optional Flow:** Anonymous user upgrades to email-verified by providing email

---

## Architecture Constraints

Per existing ADRs:

| Component | Technology | ADR Reference |
|-----------|------------|---------------|
| Frontend | Next.js 14 + ShadCN UI | ADR 0006 |
| Backend | Convex | ADR 0003 |
| Auth | Convex Auth (magic links) | ADR 0001 |
| Email (local) | Mailpit | ADR 0004 |
| Email (hosted) | Resend | ADR 0004 |

**Integration Points:**
- Works alongside existing password authentication (Task 7)
- Uses existing user schema with email field
- Leverages existing routing structure (Next.js App Router per ADR 0008)

---

## Implementation Checklist

### Backend

- [ ] Install Resend SDK in Convex
- [ ] Configure Convex Auth with Resend provider
- [ ] Add magic link generation endpoint
- [ ] Add magic link verification endpoint
- [ ] Update schema if needed (email field already exists from Task 7)
- [ ] Write backend tests for magic link generation and verification

### Frontend

- [ ] Create magic link request form component
- [ ] Add "Sign in with email" option to login page
- [ ] Handle email submission and loading states
- [ ] Create "Check your email" success screen
- [ ] Handle magic link verification on callback
- [ ] Add error handling for expired/invalid links
- [ ] Write component tests

### Email Integration

**Local Development:**
- [ ] Configure Mailpit for local email capture (Docker)
- [ ] Set SMTP environment variables for localhost:1025
- [ ] Create email template for magic link
- [ ] Test email delivery to Mailpit

**Hosted/Production:**
- [ ] Configure Resend API key in Convex environment
- [ ] Test email delivery via Resend
- [ ] Verify email templates render correctly

### Testing

- [ ] Write E2E test for complete magic link flow
- [ ] Test email delivery (Mailpit locally)
- [ ] Test link expiration handling
- [ ] Test invalid link handling
- [ ] Generate validation trace with Playwright

---

## Validation Points

### Local Development

- [ ] Magic link email appears in Mailpit UI (`http://localhost:8025`)
- [ ] Email contains valid link to `http://localhost:3000`
- [ ] Clicking link authenticates user and redirects to dashboard
- [ ] Session persists across page refreshes
- [ ] Invalid/expired links show appropriate error
- [ ] E2E test passes with validation trace

### Hosted Dev (Optional)

- [ ] Configure Resend test API key in Convex
- [ ] Magic link email logged in Resend dashboard
- [ ] Email verification flow works end-to-end
- [ ] Emails use test mode (not delivered to real inboxes)

---

## Environment Setup

### Local Development

**Prerequisites:**
- Docker (for Mailpit)
- Node.js 20+

**Services:**
```bash
# Terminal 1: Next.js
cd app
npm run dev

# Terminal 2: Convex
cd app
npx convex dev

# Terminal 3: Mailpit
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

**Environment Variables (.envrc):**
```bash
# Mailpit (local email)
export SMTP_HOST=localhost
export SMTP_PORT=1025

# Resend (hosted)
export RESEND_API_KEY=re_test_... # Test mode key
```

### Mailpit Web UI

Access captured emails at: `http://localhost:8025`

---

## User Flows

### Primary Flow: Magic Link Sign In

1. User navigates to `/login`
2. User selects "Sign in with email" option
3. User enters email address
4. System sends magic link email
5. User sees "Check your email" message
6. User opens email and clicks link
7. User is redirected to `/dashboard` authenticated
8. Session persists

### Optional Flow: Anonymous Upgrade

1. Anonymous user on dashboard
2. User clicks "Enable Collaboration"
3. User enters email address
4. System sends magic link
5. User clicks link
6. Same session upgraded to email-verified
7. User ID remains the same

---

## Technical Design Decisions

### Email Provider Strategy

**Local Development:**
- Use Mailpit (Docker) for email capture
- No external API calls
- Fast iteration

**Hosted/Production:**
- Use Resend API for email delivery
- Test mode for development
- Production mode for live environment

### Magic Link Security

- Links expire after 10 minutes (Convex Auth default)
- One-time use tokens
- Secure token generation (Convex Auth handles this)

### Session Management

- Leverage existing Convex Auth session management
- Use same session cookie as password auth
- No custom JWT handling needed

---

## Integration with Existing Auth

This task integrates with existing password authentication from Task 7:

**Login Page Options:**
```
┌─────────────────────────────┐
│  Sign in to Artifact Review │
├─────────────────────────────┤
│  Email: [____________]      │
│  Password: [____________]   │
│  [Sign In]                  │
│                             │
│  ─── or ───                 │
│                             │
│  [Sign in with Email Link]  │
└─────────────────────────────┘
```

**User Table (existing from Task 7):**
- `email` field already exists
- `by_email` index already exists
- No schema changes needed

---

## Success Criteria

- [ ] User can request magic link via email
- [ ] Magic link email arrives in Mailpit locally
- [ ] Clicking link authenticates user
- [ ] Session persists across page refreshes
- [ ] Invalid/expired links show errors
- [ ] E2E tests passing (3+ tests)
- [ ] Validation trace generated
- [ ] Test report documentation created

---

## Deliverables

1. **Code:**
   - Magic link request form component
   - Email verification callback handling
   - Convex Auth configuration with Resend provider
   - Email templates

2. **Tests:**
   - Backend tests for magic link endpoints
   - Component tests for forms
   - E2E tests for complete flow
   - Validation trace (Playwright)

3. **Documentation:**
   - PROGRESS.md tracking implementation
   - test-report.md with coverage details
   - Email configuration guide

---

## References

- [Task 6 README](../00006-local-dev-environment/README.md) - Original Step 2 scope
- [ADR 0001: Authentication Provider](../../docs/architecture/decisions/0001-authentication-provider.md)
- [ADR 0004: Email Strategy](../../docs/architecture/decisions/0004-email-strategy.md)
- [ADR 0008: Next.js App Router](../../docs/architecture/decisions/0008-nextjs-app-router-for-routing.md)
- [Convex Auth Docs](https://labs.convex.dev/auth)
- [Resend Docs](https://resend.com/docs)
- [Mailpit Docs](https://mailpit.axllent.org/)

---

## Next Steps

1. **Planning Phase:** Use architect agent to create detailed implementation plan
2. **Development:** Use tdd-developer agent to implement with tests-first approach
3. **Validation:** E2E tests with Playwright trace generation
4. **Documentation:** Update PROGRESS.md and create test-report.md
