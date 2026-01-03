# Subtask 13: Auth-Based Routing

## Overview

Implement basic authentication-based routing to redirect users based on their login state.

## Requirements

### Phase 1 (This Subtask)

**When logged IN, redirect away from:**
- `/` (home) → `/dashboard`
- `/login` → `/dashboard`
- `/register` (signup) → `/dashboard`

**When logged OUT, redirect to home from:**
- `/dashboard` → `/`
- Any other protected pages → `/`

### Future Phases (Not This Subtask)
- More advanced logged-out states for various pages
- More advanced logged-in states and permissions

## Analysis Needed

Before implementation, architect should document:
1. Current auth state management (where is login state stored?)
2. What happens when user logs out from anywhere in the app
3. What happens when logged-in user visits various sections
4. Current routing structure and any existing redirect logic
5. Recommended approach for implementing redirects

## Acceptance Criteria

- [x] Logged-in users redirected from `/`, `/login`, `/register` to `/dashboard`
- [x] Logged-out users redirected from `/dashboard` to `/`
- [x] Smooth redirect experience (no flash of wrong content)
- [x] Existing tests pass (455 tests passing)
- [x] New tests for redirect behavior (23 new tests)

## Implementation Summary

### Files Created
- `src/hooks/useAuthRedirect.ts` - Central auth redirect hook
- `src/components/auth/FullPageSpinner.tsx` - Loading spinner component
- `src/components/auth/PublicOnlyPage.tsx` - Wrapper for public-only pages
- `src/components/auth/ProtectedPage.tsx` - Wrapper for protected pages
- `src/__tests__/hooks/useAuthRedirect.test.tsx` - Hook tests (9 tests)
- `src/__tests__/auth/FullPageSpinner.test.tsx` - Spinner tests (4 tests)
- `src/__tests__/auth/PublicOnlyPage.test.tsx` - Public page tests (5 tests)
- `src/__tests__/auth/ProtectedPage.test.tsx` - Protected page tests (5 tests)

### Pages Updated
- `/login` - Added PublicOnlyPage wrapper
- `/register` - Added PublicOnlyPage wrapper
- `/dashboard` - Added ProtectedPage wrapper
- `/` (home) - Already has redirect logic, left as is

### Test Report
See `test-report.md` for full test coverage details.
