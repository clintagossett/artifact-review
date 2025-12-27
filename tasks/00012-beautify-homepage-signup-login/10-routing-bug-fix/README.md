# Subtask 10: Fix Hash Navigation Routing Bug

## Problem

When users navigate from homepage anchor links (like #pricing) to the login page and then click the browser back button, the page doesn't render correctly. The URL shows /#pricing but the homepage content doesn't display.

## Root Cause

The `LandingHeader` component uses plain HTML anchor tags (`<a href="#pricing">`) for hash navigation. These don't work well with Next.js client-side routing and browser history, causing the page to break when using the back button.

## Reproduction Steps

1. Go to homepage (http://localhost:3000/)
2. Click "Pricing" link in header (navigates to /#pricing)
3. Click "Sign In" button (navigates to /login)
4. Click browser "Back" button
5. Result: URL shows /#pricing but page stays broken

## Solution Approach

Replace plain anchor tags with proper Next.js scroll behavior that:
1. Works with browser history
2. Handles hash navigation correctly
3. Scrolls to the target section
4. Works for all anchor links (#features, #pricing, #faq)

## TDD Approach

1. Write E2E test that reproduces the bug
2. Confirm test fails (RED)
3. Fix the component
4. Fix the component
5. Confirm test passes (GREEN)
6. Test all anchor links
7. Generate validation trace

## Files Modified

- `app/src/components/landing/LandingHeader.tsx` - Fix anchor navigation
- `app/src/components/landing/LandingFooter.tsx` - Fix footer links (if needed)

## Tests

Location: `tests/e2e/hash-navigation.spec.ts`

Coverage:
- Back button navigation from /login to /#pricing
- All header anchor links (#features, #pricing, #faq)
- Proper scroll behavior
- Homepage content visibility after navigation
