# Implementation Notes - Task 20

## Status Terminology Issues (Discovered 2026-01-03)

### Current Problem
The Settings → Access & Activity tab shows:
- "Active" status for users who have signed up but NOT viewed the artifact
- "People: 1 active, 0 pending" counts based on account creation, not viewing

### Expected Behavior (Artifact Owner's Perspective)
From the perspective of someone asking for artifact review:

| Status | Meaning |
|--------|---------|
| **Pending** | Invited but hasn't viewed the artifact yet |
| **Viewed** | Has opened/viewed the artifact at least once |
| **Active** | Currently viewing (real-time presence indicator) |

### People Count
- **Pending**: Invited reviewers who have NOT viewed yet
- **Viewed**: Reviewers who have viewed at least once
- This is about engagement with the artifact, NOT system account status

### Fix Required
- Update `deriveReviewerStatus` logic in `lib/access.ts`
- Update UI labels and badge colors accordingly
- "Active" should only show for real-time presence (currently viewing)

---

## Deep Linking for Signup Flow

### Current Problem
When an unauthenticated user:
1. Clicks artifact link from invitation email
2. Gets redirected to signin/signup
3. Completes authentication (including magic link)
4. Lands on dashboard instead of target artifact

### Required Behavior
1. Store target URL before redirect to auth
2. Persist through entire auth flow (including email magic links)
3. Redirect to target after successful auth

### Implementation Approach
- Use `sessionStorage` or `localStorage` to store return URL
- Key: `artifact_review_return_url`
- Set on auth redirect, clear after use
- Must work with magic link flow (page refresh/new tab)

### Storage Choice
`localStorage` preferred over `sessionStorage`:
- Persists across browser tabs (magic links open new tab)
- Persists through page refreshes
- Clear after successful redirect to prevent stale data

---

## Dashboard Improvements Needed

### Current State
Dashboard only shows "My Artifacts" (artifacts user owns)

### Required Sections

1. **My Artifacts**
   - Artifacts the user created/owns
   - Current implementation

2. **Shared with Me**
   - Artifacts where user has been granted access
   - Use `listShared` query (already implemented in backend)
   - Show artifact name, owner, last viewed, status

3. **Recent Activity** (nice to have)
   - Quick access to recently viewed/interacted artifacts
   - Combines owned and shared
   - Sorted by last interaction time

### UI Layout Options
- Tab-based: "My Artifacts" | "Shared with Me"
- Section-based: Both visible with headers
- Filter dropdown: "All" | "Owned" | "Shared"

---

## Related Files

| File | What Needs Change |
|------|-------------------|
| `lib/access.ts` | Fix `deriveReviewerStatus` logic |
| `ArtifactAccessTab.tsx` | Update status labels/badges |
| Dashboard component | Add "Shared with Me" section |
| Auth flow components | Add return URL storage |
| `listShared` query | Already exists, needs frontend wiring |

---

## Priority

1. **High**: Status terminology fix (confusing UX)
2. **High**: Deep linking for signup (broken user flow)
3. **Medium**: Dashboard shared artifacts section
4. **Low**: Recent activity section
