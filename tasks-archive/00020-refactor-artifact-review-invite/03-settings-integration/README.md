# Subtask 03: Settings Access & Activity Integration

**Parent Task:** 00020-refactor-artifact-review-invite
**Status:** OPEN
**Created:** 2026-01-03
**Dependencies:** 01-backend, 02-frontend (components created)

---

## Objective

Wire up the `ArtifactAccessTab` component in Artifact Settings to use real data from the new `access.ts` backend instead of mock data.

---

## Current State

The `ArtifactAccessTab` component (`app/src/components/artifact-settings/ArtifactAccessTab.tsx`) currently:
- Uses `mockReviewers` array with hardcoded data
- Uses local `useState` for reviewer management
- Has TODO comments for backend integration
- Missing Activity Overview section (present in figma designs)

---

## Deliverables

### 1. Wire Up Existing Components

Replace mock data and local state with real Convex queries/mutations:

| Current | Replace With |
|---------|--------------|
| `mockReviewers` | `useQuery(api.access.listReviewers, { artifactId })` |
| `handleSendInvite` local state | `useMutation(api.access.grant)` |
| `handleResendInvite` toast only | `useMutation(api.access.resend)` |
| `handleRevokeInvite` local state | `useMutation(api.access.revoke)` |

### 2. Reuse Existing Components

Leverage components from subtask 02-frontend:
- Consider reusing `InviteReviewerForm` for the invite section
- Consider reusing `ReviewerRow` patterns for consistency
- Use `deriveReviewerStatus` utility from `lib/access.ts`

### 3. Add Activity Overview Section

Per figma designs (`figma-designs/ARTIFACT_SETTINGS.md`), add activity stats:

```typescript
interface ActivityStats {
  totalViews: number;
  uniqueViewers: number;
  totalComments: number;
  activeCommenters: number;
  lastViewed: { timestamp: string; user: string } | null;
  lastComment: { timestamp: string; user: string } | null;
}
```

**Backend query needed:** `getActivityStats` in `convex/access.ts`

### 4. Fix Owner Check

Current code has:
```typescript
// TODO: Check if current user is the owner
const isOwner = true;
```

Wire up to use real owner check via `getPermission` query.

---

## Implementation Order

1. Replace `mockReviewers` with `listReviewers` query
2. Wire up `grant` mutation for invite form
3. Wire up `resend` mutation
4. Wire up `revoke` mutation (with confirmation dialog)
5. Add `getActivityStats` query to backend
6. Add Activity Overview section to UI
7. Fix owner check in `ArtifactSettingsClient.tsx`

---

## Validation Scenarios

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Open Settings → Access tab | Shows real reviewers from DB |
| 2 | Invite new email | Calls `grant`, shows in pending list |
| 3 | Resend invitation | Calls `resend`, toast confirms |
| 4 | Revoke/Remove access | Confirmation → calls `revoke`, removed from list |
| 5 | Non-owner visits settings | Redirected (can't access) |
| 6 | Activity stats display | Shows real view/comment counts |

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/src/components/artifact-settings/ArtifactAccessTab.tsx` | Replace mock data with queries/mutations |
| `app/src/app/a/[shareToken]/settings/ArtifactSettingsClient.tsx` | Wire up real owner check |
| `app/convex/access.ts` | Add `getActivityStats` query |

---

## Notes

- The ShareModal (from 02-frontend) and Settings Access tab now have overlapping functionality
- Consider whether to share components or keep them separate (Settings has more detail)
- Activity stats may require new indexes or aggregation queries

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `tests/` | Integration tests (to be created) |
