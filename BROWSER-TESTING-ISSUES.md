# Browser Testing Issues

**Date:** 2025-12-27
**Tested URL:** http://localhost:3000

---

## Summary

| Severity | Count |
|----------|-------|
| High | 2 |
| Medium | 1 |
| Low | 0 |

---

## Issues Found

### 1. [HIGH] Dashboard throws unhandled error for unauthenticated users

**Route:** `/dashboard`

**Expected Behavior:**
When an unauthenticated user visits `/dashboard`, they should be redirected to `/login` or see a friendly "Please log in" message.

**Actual Behavior:**
Shows an "Unhandled Runtime Error" overlay with:
```
Error: [CONVEX Q(artifacts:list)] [Request ID: ...] Server Error
Uncaught Error: Not authenticated
  at handler (../convex/artifacts.ts:227:11)
```

**Source:**
`src/app/dashboard/page.tsx` line 21 - `useQuery(api.artifacts.list)`

**Impact:**
Poor user experience - technical error shown instead of proper auth flow.

**Suggested Fix:**
Add authentication check before calling `api.artifacts.list` query, or add redirect logic for unauthenticated users in the dashboard page.

---

### 2. [HIGH] Artifact viewer stuck in loading state for invalid shareToken

**Route:** `/a/{shareToken}` (e.g., `/a/test123`)

**Expected Behavior:**
When accessing an artifact with an invalid/non-existent shareToken, should display a 404 page or "Artifact not found" message.

**Actual Behavior:**
Page shows skeleton loading state indefinitely. Never resolves to an error state or 404 page.

**Impact:**
Users with invalid links see an endless loading screen with no feedback.

**Suggested Fix:**
Handle the case where `getByShareToken` returns null and display a proper "Artifact not found" page.

---

### 3. [MEDIUM] Password login form - no validation feedback for empty fields

**Route:** `/login` (Password tab)

**Expected Behavior:**
When clicking "Sign In" with empty email and/or password fields, should show validation errors (e.g., "Email is required", "Password is required").

**Actual Behavior:**
Clicking "Sign In" with empty fields produces no visible validation message. The form just doesn't submit with no user feedback.

**Note:**
The Magic Link tab *does* show validation ("Please enter a valid email address") for invalid email format, so this may be a gap specific to the Password tab's empty field handling.

**Impact:**
Minor UX issue - users don't know why their login isn't working.

**Suggested Fix:**
Add client-side validation to show error messages for empty required fields.

---

## Working Features

The following features were tested and work correctly:

- Landing page loads correctly
- Login page renders with Password and Magic Link tabs
- Magic Link tab shows proper validation for invalid email format
- Magic Link flow shows "Check Your Email" confirmation page
- Sign up page renders with both Password and Magic Link options
- Sign up Magic Link tab shows "Passwordless sign up" info
- Navigation between pages works correctly
- Back button functionality works

---

## Environment Notes

- Next.js version shows outdated warning: `Next.js (14.2.35) is outdated`
- Browser extension (Grammarly) adds extra attributes but doesn't affect functionality
