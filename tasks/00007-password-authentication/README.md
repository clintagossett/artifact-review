# Task 00007: Password Authentication

**GitHub Issue:** #6
**Status:** Not Started
**Created:** 2025-12-26

---

## Objective

Implement basic password authentication to allow users to create accounts and sign in with username/password credentials.

**Key Principle:** Keep it simple - username + password only. Email integration deferred to later task.

---

## Scope

### In Scope
- User registration with username + password
- User sign-in with username + password
- Secure password hashing (bcrypt via Convex Auth)
- Session persistence after password login
- Sign-out functionality
- Basic validation (username length, password strength)

### Out of Scope
- Email/password combination (username only)
- Password reset functionality
- Email verification
- OAuth providers (Google, GitHub, etc.)
- Password strength meters
- Account recovery
- Polished UI (minimal forms only)

---

## Success Criteria

### Functional Requirements
- [x] Users can register with unique username + password
- [ ] Users can sign in with correct credentials
- [ ] Invalid credentials show appropriate error
- [ ] Passwords are securely hashed (never stored in plaintext)
- [ ] Session persists across page refreshes
- [ ] Users can sign out successfully
- [ ] Duplicate username registration is prevented

### Technical Requirements
- [ ] Backend tests covering registration, login, validation
- [ ] E2E test with Playwright validating full flow
- [ ] Validation trace generated
- [ ] Test report documenting coverage
- [ ] Structured logging throughout auth flow

### Definition of Done
- [ ] All tests passing (backend + E2E)
- [ ] Validation trace in `tests/validation-videos/`
- [ ] Test report written
- [ ] Code follows Convex rules
- [ ] Structured logging implemented

---

## Technical Approach

### Stack
- **Auth Provider:** Convex Auth Password provider
- **Password Hashing:** bcrypt (built into Convex Auth)
- **UI Components:** ShadCN UI (Form, Input, Button, Card)
- **Validation:** Convex validators + client-side validation

### Schema Changes

Update `app/convex/schema.ts`:

```typescript
// Add to users table
users: defineTable({
  // ... existing fields
  username: v.optional(v.string()),        // For password auth
  // Password hash stored by Convex Auth automatically
})
  .index("by_username", ["username"]),     // For username lookup
```

### Convex Functions

**New functions needed:**
- `auth.signInWithPassword` - Sign in with username/password
- `auth.signUpWithPassword` - Register new user
- `users.getByUsername` - Look up user by username (for validation)

**Existing function updates:**
- `auth.getCurrentUser` - Already handles all auth types

### UI Components

**Registration Form** (`src/components/auth/RegisterForm.tsx`):
- Username input (3-20 chars, alphanumeric + underscore)
- Password input (min 8 chars)
- Confirm password input
- Register button
- Link to login form

**Login Form** (`src/components/auth/LoginForm.tsx`):
- Username input
- Password input
- Sign in button
- Link to register form

**Dashboard Updates** (`src/app/page.tsx`):
- Show username for password-authenticated users
- Show "Anonymous session" vs "Signed in as @username"

---

## Implementation Plan

### Phase 1: Backend (TDD)
1. Write tests for password registration
2. Implement Convex Auth Password provider
3. Write tests for password login
4. Implement sign-in functionality
5. Write tests for username uniqueness
6. Add username index and validation

### Phase 2: Frontend (TDD)
1. Write tests for RegisterForm component
2. Implement registration UI
3. Write tests for LoginForm component
4. Implement login UI
5. Update dashboard to show username
6. Add form validation and error handling

### Phase 3: E2E Validation
1. Setup Playwright tests in task folder
2. Write E2E test for full registration flow
3. Write E2E test for login/logout flow
4. Generate validation trace
5. Create test report

---

## Testing Strategy

### Backend Tests

**File:** `app/convex/__tests__/passwordAuth.test.ts`

Test cases:
- User can register with valid username/password
- Duplicate username registration fails
- User can sign in with correct credentials
- User cannot sign in with incorrect password
- User cannot sign in with non-existent username
- Password is hashed (not stored in plaintext)

### Frontend Tests

**File:** `app/src/components/auth/__tests__/RegisterForm.test.tsx`

Test cases:
- Form renders with all fields
- Username validation works (length, characters)
- Password validation works (min length)
- Password confirmation must match
- Form submission calls correct API
- Error messages display correctly

**File:** `app/src/components/auth/__tests__/LoginForm.test.tsx`

Test cases:
- Form renders with username and password fields
- Form submission calls sign-in API
- Error handling for invalid credentials

### E2E Tests

**File:** `tasks/00007-password-authentication/tests/e2e/password-auth.spec.ts`

Test flows:
1. Registration → Login → Dashboard (shows username) → Sign out
2. Duplicate registration attempt (shows error)
3. Invalid login attempt (shows error)

---

## Validation Artifacts

### Required Deliverables
1. **Backend tests** - All passing
2. **Frontend tests** - All passing
3. **E2E test** - Complete user journey
4. **Validation trace** - `tests/validation-videos/password-auth-trace.zip`
5. **Test report** - `test-report.md`

### Trace Should Show
- User fills registration form
- Submits and sees success
- Signs out
- Signs back in with same credentials
- Dashboard shows username
- Session persists after refresh

---

## Security Considerations

### Password Security
- ✅ Passwords hashed with bcrypt (Convex Auth handles this)
- ✅ Never log passwords (even in debug mode)
- ✅ Password minimum length: 8 characters
- ✅ No password stored in plaintext anywhere

### Username Security
- ✅ Case-insensitive uniqueness check
- ✅ Alphanumeric + underscore only
- ✅ Length: 3-20 characters
- ✅ No special characters (prevents injection)

### Session Security
- ✅ JWT tokens managed by Convex Auth
- ✅ Secure token storage (handled by Convex)
- ✅ Token expiration configured

---

## UI/UX Guidelines

### Registration Experience
1. Show form immediately (no redirect)
2. Validate on blur (instant feedback)
3. Clear error messages
4. Success → auto sign-in → redirect to dashboard

### Login Experience
1. Username + password only (simple)
2. Generic error for failed login (don't reveal if username exists)
3. Success → redirect to dashboard

### Error Messages
- **Registration:**
  - "Username must be 3-20 characters"
  - "Username can only contain letters, numbers, and underscores"
  - "Username already taken"
  - "Password must be at least 8 characters"
  - "Passwords must match"

- **Login:**
  - "Invalid username or password" (generic for security)

---

## References

- [Convex Auth Password Provider](https://labs.convex.dev/auth/config/passwords)
- [ShadCN Form Component](https://ui.shadcn.com/docs/components/form)
- [Testing Guide](../../docs/development/testing-guide.md)
- [Workflow Guide](../../docs/development/workflow.md)
- [TESTING-QUICK-START](../../docs/development/TESTING-QUICK-START.md)

---

## Notes

- Keep UI minimal - polished design comes later
- Focus on functionality and testing
- Username-only for now - email auth is separate task
- Follow TDD workflow strictly (test first)
- Use Playwright trace.zip for validation (not manual video)
