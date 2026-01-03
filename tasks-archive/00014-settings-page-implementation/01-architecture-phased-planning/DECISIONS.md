# Implementation Decisions

**Date:** 2025-12-27
**Decided By:** User

---

## Decision 1: Email Template Approach

**Question:** Should forgot password use a distinct email template or reuse the standard magic link email?

**Decision:** ✅ **Reuse standard magic link email**

**Rationale:**
- Simpler implementation
- Leverages existing infrastructure
- Magic link already creates fresh grace period
- Users just need to navigate to Settings after login

**Implementation:**
- Forgot password page sends standard magic link
- User clicks link → authenticated → navigates to Settings
- Grace period is active for 15 minutes
- User changes password without current password

---

## Decision 2: Debug Toggle in Production

**Question:** Should the debug toggle be completely removed in production builds or hidden behind a feature flag?

**Decision:** ✅ **Remove completely in production**

**Rationale:**
- Security - no debug controls in production
- Clean production code
- Simple implementation via `process.env.NODE_ENV === 'development'`

**Implementation:**
```typescript
{process.env.NODE_ENV === 'development' && <DebugToggle />}
```

---

## Decision 3: Password Validation Standard

**Question:** What password requirements should we enforce, and how do we ensure consistency?

**Decision:** ✅ **Reuse existing password validation from RegisterForm**

**Current Standard:**
- At least 8 characters
- Contains a number
- Contains a letter (uppercase or lowercase)

**Components to Reuse:**
1. `PasswordStrengthIndicator` - visual strength meter
2. Password requirements checklist pattern
3. Confirm password matching

**Rationale:**
- Maintain consistency across the app
- Users already familiar with this pattern from registration
- Proven validation logic already implemented

**Implementation:**
- Create reusable `PasswordInput` component (or similar)
- Include `PasswordStrengthIndicator`
- Include requirements checklist
- Include confirm password field for password changes
- Use in both:
  - RegisterForm (already implemented)
  - Settings password change section (new)

---

## Action Items

- [ ] Update PHASED-PLAN.md to reflect these decisions
- [ ] Document password component reuse in Phase 4 implementation
- [ ] Ensure debug toggle is environment-gated in all implementations
- [ ] Use standard magic link flow for forgot password (no custom template needed initially)

---

## Component Reuse Strategy

### Existing Password Components

| Component | Location | Usage |
|-----------|----------|-------|
| `PasswordStrengthIndicator` | `app/src/components/auth/PasswordStrengthIndicator.tsx` | Strength meter |
| `RegisterForm` (password section) | `app/src/components/auth/RegisterForm.tsx` | Pattern reference |

### New Components Needed

| Component | Purpose | Reuses |
|-----------|---------|--------|
| Settings password section | Password change UI | `PasswordStrengthIndicator`, same validation logic |

### Validation Requirements (Standardized)

```typescript
const passwordRequirements = [
  { label: "At least 8 characters", met: password.length >= 8 },
  { label: "Contains a number", met: /\d/.test(password) },
  { label: "Contains a letter", met: /[a-zA-Z]/.test(password) },
];

const allRequirementsMet = passwordRequirements.every((req) => req.met);
```

This pattern should be used consistently across:
- Registration
- Password changes in Settings
- Any future password entry points
