# Resume: Task 7 - Password Authentication

**Last Updated:** 2025-12-26
**Session:** Not Started

**Status:** Ready to begin implementation

---

## Quick Start (New Session)

```bash
# Start dev servers
cd app
npm run dev:log

# In new terminal: Run backend tests
cd app && npx vitest run convex/__tests__/

# In new terminal: Run E2E tests (after setup)
cd tasks/00007-password-authentication/tests && npx playwright test
```

---

## What's Planned

| Component | Status | Notes |
|-----------|--------|-------|
| Backend - Password Registration | Not Started | Convex Auth Password provider |
| Backend - Password Login | Not Started | Sign-in with username/password |
| Frontend - Registration Form | Not Started | ShadCN Form component |
| Frontend - Login Form | Not Started | ShadCN Form component |
| Backend Tests | Not Started | Registration, login, validation |
| E2E Tests | Not Started | Full user journey |
| Validation Trace | Not Started | Playwright trace.zip |

---

## Implementation Steps

### Phase 1: Backend (TDD)
- [ ] Setup E2E test structure (`npm install` in tests/)
- [ ] Write test: User can register with username/password
- [ ] Implement: Configure Convex Auth Password provider
- [ ] Write test: Duplicate username fails
- [ ] Implement: Username uniqueness validation
- [ ] Write test: User can sign in with correct credentials
- [ ] Implement: Sign-in functionality
- [ ] Write test: Invalid credentials fail appropriately
- [ ] Implement: Error handling

### Phase 2: Frontend (TDD)
- [ ] Write test: RegisterForm renders correctly
- [ ] Implement: RegisterForm component
- [ ] Write test: Form validation works
- [ ] Implement: Client-side validation
- [ ] Write test: LoginForm renders correctly
- [ ] Implement: LoginForm component
- [ ] Write test: Dashboard shows username
- [ ] Implement: Dashboard updates

### Phase 3: E2E & Validation
- [ ] Write E2E test: Registration flow
- [ ] Write E2E test: Login/logout flow
- [ ] Generate validation trace
- [ ] Create test report
- [ ] Document any issues or learnings

---

## Schema Changes

```typescript
// convex/schema.ts updates needed
users: defineTable({
  // ... existing fields
  username: v.optional(v.string()),
  isAnonymous: v.optional(v.boolean()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})
  .index("by_username", ["username"]),
```

---

## Files to Create/Modify

### Backend
- `app/convex/auth.ts` - Add Password provider
- `app/convex/schema.ts` - Add username field and index
- `app/convex/__tests__/passwordAuth.test.ts` - New test file

### Frontend
- `app/src/components/auth/RegisterForm.tsx` - New
- `app/src/components/auth/LoginForm.tsx` - New
- `app/src/components/auth/__tests__/RegisterForm.test.tsx` - New
- `app/src/components/auth/__tests__/LoginForm.test.tsx` - New
- `app/src/app/page.tsx` - Update to show username

### E2E Tests
- `tasks/00007-password-authentication/tests/package.json` - Playwright
- `tasks/00007-password-authentication/tests/playwright.config.ts` - Config
- `tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts` - Tests

---

## Key Commands

```bash
# Backend tests
cd app && npx vitest run convex/__tests__/passwordAuth.test.ts

# Frontend tests
cd app && npx vitest run src/components/auth/

# E2E tests
cd tasks/00007-password-authentication/tests
npx playwright test                    # Headless
npx playwright test --headed          # With browser
npx playwright test --ui              # Interactive

# View trace
npx playwright show-trace validation-videos/password-auth-trace.zip
```

---

## Required Reading

Before implementing:
1. `docs/development/TESTING-QUICK-START.md` - E2E setup
2. `docs/development/workflow.md` - TDD cycle
3. `docs/architecture/convex-rules.md` - Backend patterns
4. [Convex Auth Password Docs](https://labs.convex.dev/auth/config/passwords)

---

## Success Criteria

- [x] All backend tests passing
- [ ] All frontend tests passing
- [ ] E2E test covering registration → login → dashboard
- [ ] Validation trace generated
- [ ] Test report documenting coverage
- [ ] Structured logging throughout
- [ ] Code follows Convex rules

---

## Next Session Checklist

When resuming work:
1. Read this RESUME.md
2. Read task README.md for full requirements
3. Check what's been completed above
4. Continue with next unchecked item
5. Update this file as you progress

---

## Notes

- Username only (no email yet)
- Keep UI minimal - just functional forms
- Use Playwright trace.zip for validation
- Follow TDD strictly (test first, always)
