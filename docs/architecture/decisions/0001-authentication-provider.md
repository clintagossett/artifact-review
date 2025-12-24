# ADR 0001: Authentication Provider

**Status:** Accepted
**Date:** 2024-12-24
**Decision Maker:** Clint Gossett

## Context

We need an authentication solution for the HTML Review Platform that supports:

1. **Social logins** for document creators (Google, GitHub, etc.)
2. **Magic link logins** for reviewers (simple, no password friction)
3. **SSO/SAML** for future enterprise customers
4. **Convex integration** (our backend)
5. **Migration-friendly** user identification

## Decision

**Use Convex Auth now, with email-based user identification for future migration flexibility.**

### Configuration

- **No anonymous authentication** — every user must have an email
- **Email as primary identifier** — enables account linking and future provider migration
- **Magic links via Resend** — simple reviewer onboarding (3K free emails/month)
- **OAuth providers** — Google, GitHub for document creators
- **Account linking by email** — same email = same user across auth methods

### Email Provider

Magic links are sent via **Resend**. See [ADR 0004: Email Strategy](./0004-email-strategy.md) for full email provider decision, including:
- Provider comparison and rationale
- Environment-specific configuration (Mailpit for local, Resend for hosted)
- Cost projections

### Auth Providers Considered

| Provider | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Convex Auth** | Native integration, free, magic links, 80+ OAuth via Auth.js | No SSO/MFA | **Chosen for MVP** |
| **Clerk** | SSO now free, great DX, pre-built UI | External dependency, MAU pricing | Future upgrade path |
| **WorkOS** | Enterprise-grade, 1M free MAU | SSO costs $125/connection/mo | Overkill for now |
| **Auth0** | Established, many features | Magic links require paid tier, complex | Too expensive |

## Consequences

### Positive

- Simplest integration with Convex (native)
- No third-party costs during MVP/early growth
- User data stays in our Convex database
- Magic links enable frictionless reviewer experience
- Account linking allows users to upgrade from magic link to social login

### Negative

- No SSO/SAML until we migrate to Clerk or similar
- No MFA support (acceptable for MVP)
- Migration work required when enterprise features needed

### Migration Path

When SSO is required:

1. Users are identified by **email** (verified), not provider-specific IDs
2. Switch to Clerk with same email-based linking
3. Existing users authenticate with Clerk → matched to existing records by email
4. No data loss, users just re-authenticate once

## Implementation Details

### Schema (migration-friendly)

```ts
// convex/schema.ts
users: defineTable({
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  role: v.optional(v.union(v.literal("creator"), v.literal("reviewer"))),
}).index("byEmail", ["email"])
```

### Account Linking Logic

```ts
// convex/auth.ts
callbacks: {
  async createOrUpdateUser(ctx, args) {
    if (args.existingUserId) {
      return args.existingUserId;
    }

    // Link by verified email
    const email = args.profile.email;
    if (email) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", email))
        .unique();

      if (existingUser) {
        return existingUser._id;
      }
    }

    return await ctx.db.insert("users", {
      email: args.profile.email,
      name: args.profile.name,
      image: args.profile.image,
      emailVerificationTime: args.profile.emailVerified ? Date.now() : undefined,
    });
  },
}
```

### User Flows

| User Type | Auth Method | Notes |
|-----------|-------------|-------|
| Document Creator | Google/GitHub OAuth | Full account with dashboard |
| Reviewer (invited) | Magic link | Click email → instant access |
| Reviewer upgrading | OAuth (later) | Linked to same account by email |

## Testing Strategy

> **Note:** See [deployment-environments.md](../deployment-environments.md) for full SDLC and environment configuration details.

### Unit Testing Auth Logic

**What to test:**
1. **Account linking by email** — same email creates single user
2. **Email verification tracking** — `emailVerificationTime` set correctly
3. **User creation vs update** — `existingUserId` path vs new user path
4. **Role assignment** — creators vs reviewers get correct roles

**Testing approach:**
```ts
// convex/auth.test.ts (using Convex testing framework)
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";

test("account linking: same email links to existing user", async () => {
  const t = convexTest(schema);

  // Create user via magic link
  const userId1 = await t.mutation(internal.auth.createOrUpdateUser, {
    profile: { email: "test@example.com", name: "Test User" },
    existingUserId: null,
  });

  // Sign in with OAuth using same email
  const userId2 = await t.mutation(internal.auth.createOrUpdateUser, {
    profile: { email: "test@example.com", name: "Test User", image: "..." },
    existingUserId: null,
  });

  expect(userId1).toBe(userId2); // Same user ID
});

test("new email creates new user", async () => {
  const t = convexTest(schema);

  const userId1 = await t.mutation(internal.auth.createOrUpdateUser, {
    profile: { email: "user1@example.com" },
    existingUserId: null,
  });

  const userId2 = await t.mutation(internal.auth.createOrUpdateUser, {
    profile: { email: "user2@example.com" },
    existingUserId: null,
  });

  expect(userId1).not.toBe(userId2); // Different users
});
```

### Integration Testing

**Email delivery testing (multi-layer approach):**

1. **Unit tests** — Mock Resend API completely:
   ```ts
   // Mock the Resend client
   vi.mock("resend", () => ({
     Resend: vi.fn().mockImplementation(() => ({
       emails: {
         send: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
       },
     })),
   }));
   ```

2. **Local integration tests** — Use Mailpit (free, self-hosted):
   - Runs locally via Docker: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`
   - Captures SMTP traffic without sending real emails
   - Web UI at `localhost:8025` to verify magic links
   - No usage limits, no shared accounts, no security risks

3. **CI/CD tests** — Mailpit in GitHub Actions:
   ```yaml
   services:
     mailpit:
       image: axllent/mailpit
       ports:
         - 1025:1025
         - 8025:8025
   ```

4. **Staging environment** — Resend test mode:
   - Use Resend's test API key
   - Emails captured but not delivered
   - Check logs via Resend dashboard

**OAuth flows:**
- Use Convex's test environment
- Mock OAuth provider responses
- Test token exchange and profile retrieval

### Testing Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Vitest | Test runner (Convex recommended) | All tests |
| `convex-test` | Convex testing utilities | Backend logic |
| Vitest mocks | Mock Resend API | Unit tests |
| Mailpit | SMTP capture & web UI | Local dev & CI/CD |

### Test Coverage Goals

- **Account linking logic:** 100% (critical for migration)
- **User creation/update:** 100%
- **Auth callbacks:** 90%+
- **Email sending:** Integration tests only (mock provider)

## References

### Authentication
- [Convex Auth Docs](https://labs.convex.dev/auth)
- [Convex Auth Schema](https://labs.convex.dev/auth/setup/schema)
- [Convex Auth Account Linking](https://labs.convex.dev/auth/advanced)
- [Clerk Pricing](https://clerk.com/pricing) (future reference)

### Email Provider
- [Resend + Convex Integration](https://resend.com/convex)
- [Convex Auth Email Config](https://labs.convex.dev/auth/config/email)
- [Resend Pricing](https://resend.com/pricing)

### Testing
- [Convex Testing Guide](https://docs.convex.dev/testing)
- [Vitest](https://vitest.dev/)
- [Mailpit (Email Testing)](https://mailpit.axllent.org/)
