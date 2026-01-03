# Subtask 11: Login UI Fixes

## Overview

Fix UI issues on the login page identified in user review.

## Bugs to Fix

See `bug-screenshot.png` for visual reference.

### Bug 1: Tab Width and Alignment

**Issue:** The Password and Magic Link tabs are not equal width and text is not centered.

**Expected:**
- Both tabs should be exactly 50% width each
- Text in each tab button should be centered

### Bug 2: Remove Demo Account Info

**Issue:** There is a demo account info box showing test credentials that should not be in production.

**Expected:**
- Remove the entire "Demo Account" info box that displays:
  - test@example.com
  - password123
  - "Try out the app with this demo account"

## Scope

- Check the login page (`/login`) for these issues
- Check other pages with similar tab components (signup, forgot password, reset password) for consistency
- Ensure magic link screens use the same consistent styling

## Files Likely Affected

- `app/src/app/login/page.tsx`
- Potentially: `app/src/app/signup/page.tsx`
- Potentially: `app/src/app/forgot-password/page.tsx`
- Potentially: `app/src/app/reset-password/page.tsx`

## Acceptance Criteria

- [ ] Password/Magic Link tabs are 50/50 width with centered text
- [ ] Demo Account info box is completely removed
- [ ] All auth pages with similar tabs have consistent styling
- [ ] Existing tests pass
