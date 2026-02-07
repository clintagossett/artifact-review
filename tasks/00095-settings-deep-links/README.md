# Task 00095: Add Deep Links to Settings Sections

**Issue:** #95
**Status:** Complete

## Summary

Implemented path-based routing for settings sections, enabling direct deep links to specific settings pages.

## Changes

### New Files
- `app/src/app/settings/layout.tsx` - Shared layout with sidebar navigation
- `app/src/app/settings/account/page.tsx` - Account settings (info + password)
- `app/src/app/settings/agents/page.tsx` - API key management
- `app/src/app/settings/developer/page.tsx` - Developer tools
- `app/src/app/settings/billing/page.tsx` - Subscription management
- `app/e2e/settings-deep-links.spec.ts` - E2E validation tests

### Modified Files
- `app/src/app/settings/page.tsx` - Now redirects to `/settings/account`
- `app/convex/stripe.ts` - Updated redirect URLs to `/settings/billing`

## Deep Links

| Path | Section |
|------|---------|
| `/settings` | Redirects to `/settings/account` |
| `/settings/account` | Account info, password management |
| `/settings/agents` | API key management |
| `/settings/developer` | Developer tools |
| `/settings/billing` | Subscription and billing |

## Stripe Integration

Stripe checkout and billing portal now redirect to `/settings/billing`:
- Success: `/settings/billing?success=true`
- Cancel: `/settings/billing?canceled=true`
- Portal return: `/settings/billing`

## Testing

E2E tests validate:
- All deep links load correct sections
- Sidebar navigation updates URL
- Query params preserved (for Stripe redirects)
- Back to dashboard button works from all sections

Run tests:
```bash
cd app && npx playwright test settings-deep-links.spec.ts
```
