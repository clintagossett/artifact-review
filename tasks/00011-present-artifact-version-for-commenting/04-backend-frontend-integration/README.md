# Subtask 04: Backend-Frontend Integration

**Parent Task:** 00011-present-artifact-version-for-commenting
**Status:** OPEN
**Created:** 2025-12-27

---

## Overview

Connect the ShareModal UI to the real Convex backend, replacing mock data with live queries and mutations. This subtask bridges the work done in Subtask 02 (Backend) and Subtask 03 (UI Shell).

**This subtask must run sequentially after Subtasks 02 and 03 are complete.**

---

## Goals

1. Replace mock data with Convex queries
2. Wire up all mutations (invite, update permission, remove, update share link)
3. Add Share button to ArtifactHeader (owner only)
4. Implement proper error handling and loading states
5. Verify real-time updates work correctly

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| **ADR 0010** | **PROPOSED** | **BLOCKING:** Must be accepted (blocks Subtask 02) |
| Subtask 02 (Schema & Backend Foundation) | **BLOCKED** | Backend queries/mutations must exist |
| Subtask 03 (ShareModal UI Shell) | READY | UI components can be built independently |

**Why Blocked:**
Cannot start until Subtask 02 is complete. Subtask 02 is blocked by ADR 0010 decision on invitation linking architecture.

**See:** `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md`

**Blocks:**
- Subtask 05 (Polish & E2E Testing) - Cannot start until this is complete

---

## Tasks

### 4.1 Replace Mock Data with Queries

**File:** `app/src/components/artifact/ShareModal.tsx`

- [ ] Replace mock reviewers with `useQuery(api.sharing.getReviewers)`
- [ ] Replace mock link settings with `useQuery(api.sharing.getShareLinkSettings)`
- [ ] Add loading states for queries (use Skeleton components)
- [ ] Handle query errors gracefully

### 4.2 Connect Mutations

- [ ] Wire up `inviteReviewer` mutation
  - Handle success (clear form, show toast)
  - Handle errors (duplicate email, invalid format)
- [ ] Wire up `updateReviewerPermission` mutation
- [ ] Wire up `removeReviewer` mutation
  - Show confirmation dialog before removing
- [ ] Wire up `updateShareLinkPermission` mutation

### 4.3 Add Share Button to ArtifactHeader

**File:** `app/src/components/artifact/ArtifactHeader.tsx`

- [ ] Add Share button (Share2 icon from lucide-react)
- [ ] Only show for artifact owner
- [ ] Wire up to open ShareModal
- [ ] Use `useQuery(api.users.getCurrentUser)` for owner check

### 4.4 Update ArtifactViewer to Support ShareModal

**File:** `app/src/components/artifact/ArtifactViewer.tsx`

- [ ] Add state for ShareModal open/close
- [ ] Pass artifact data to ShareModal
- [ ] Ensure owner check works correctly

### 4.5 Integrate Unauthenticated Banner

**File:** `app/src/app/a/[shareToken]/page.tsx` (or wherever artifact page is rendered)

- [ ] Import `UnauthenticatedBanner` component
- [ ] Check if user is authenticated (`useQuery(api.users.getCurrentUser)`)
- [ ] Show `UnauthenticatedBanner` if user is NOT authenticated
- [ ] Pass `shareToken` and `shareLinkPermission` to banner
- [ ] Hide banner once user is authenticated

**Implementation:**
```typescript
const currentUser = useQuery(api.users.getCurrentUser);
const artifact = useQuery(api.artifacts.getByShareToken, { shareToken });

return (
  <ArtifactViewer artifact={artifact}>
    {/* Show banner for unauthenticated users */}
    {!currentUser && artifact?.shareLinkPermission && (
      <UnauthenticatedBanner
        shareToken={shareToken}
        shareLinkPermission={artifact.shareLinkPermission}
      />
    )}

    {/* Show artifact content (always visible) */}
    <ArtifactFrame src={...} />

    {/* Show comments only for authenticated users */}
    {currentUser && <CommentsSection />}
  </ArtifactViewer>
);
```

### 4.6 Post-Authentication Redirect

**NEW REQUIREMENT:** Implement deep linking so users return to the artifact after logging in.

**Where to implement:** Auth callback or redirect handling (location depends on Convex Auth setup)

**Tasks:**
- [ ] Add `returnTo` query parameter handling to auth callback
- [ ] Validate `returnTo` URL (prevent open redirect attacks)
- [ ] Redirect to `returnTo` if valid, otherwise `/dashboard`
- [ ] Security: Only allow relative URLs starting with `/`
- [ ] Security: Block protocol-relative URLs (`//evil.com`)

**Security Implementation:**
```typescript
// In auth callback/redirect handler
function isValidRedirect(url: string | null): boolean {
  if (!url) return false;
  // Only allow relative URLs starting with /
  return url.startsWith('/') && !url.startsWith('//');
}

const returnTo = searchParams.get('returnTo');
if (returnTo && isValidRedirect(returnTo)) {
  redirect(returnTo);
} else {
  redirect('/dashboard');
}
```

**See:** ADR 0010 for full deep linking architecture

### 4.7 Error Handling

- [ ] Handle mutation errors with toast notifications
- [ ] Handle network errors gracefully
- [ ] Show appropriate loading states during mutations
- [ ] Disable buttons during pending operations

### 4.8 Tests

**Location:** `tasks/00011-present-artifact-version-for-commenting/04-backend-frontend-integration/tests/integration/`

**Test File:** `share-flow.test.tsx`

**Test Cases:**

```typescript
describe("Share Integration", () => {
  it("should show Share button only for owner");
  it("should not show Share button for non-owner");
  it("should open ShareModal when Share clicked");
  it("should load reviewers from backend");
  it("should add reviewer when form submitted");
  it("should update reviewer permission");
  it("should remove reviewer");
  it("should update share link permission");
  it("should show real-time updates when data changes");
  it("should show loading state while mutations are pending");
  it("should show error toast on mutation failure");
});

describe("Unauthenticated User Experience", () => {
  it("should show UnauthenticatedBanner when not logged in");
  it("should hide UnauthenticatedBanner when logged in");
  it("should show correct message based on shareLinkPermission");
  it("should redirect to login with returnTo parameter");
});

describe("Post-Auth Deep Linking", () => {
  it("should redirect to artifact after successful login");
  it("should redirect to dashboard if no returnTo parameter");
  it("should reject absolute URLs in returnTo");
  it("should reject protocol-relative URLs in returnTo");
  it("should accept valid relative URLs in returnTo");
});
```

---

## Acceptance Criteria

- [ ] Share button visible only to artifact owners
- [ ] Real data loads from Convex
- [ ] All CRUD operations work (invite, update, remove)
- [ ] Real-time updates work (changes reflect immediately)
- [ ] Error states handled with user-friendly messages
- [ ] Loading states shown during data fetching and mutations
- [ ] All integration tests pass

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/artifact/ShareModal.tsx` | Updated with real queries/mutations |
| `app/src/components/artifact/ArtifactHeader.tsx` | Updated with Share button |
| `app/src/components/artifact/ArtifactViewer.tsx` | Updated with modal state |
| `tests/integration/share-flow.test.tsx` | Integration test suite |
| `test-report.md` | Test coverage report |

---

## Implementation Details

### Query Integration Pattern

```typescript
// In ShareModal.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ShareModal({ artifact, isOpen, onClose }: ShareModalProps) {
  // Queries - skip when modal is closed
  const reviewers = useQuery(
    api.sharing.getReviewers,
    isOpen ? { artifactId: artifact._id } : "skip"
  );

  const shareLinkSettings = useQuery(
    api.sharing.getShareLinkSettings,
    isOpen ? { artifactId: artifact._id } : "skip"
  );

  // Mutations
  const inviteReviewer = useMutation(api.sharing.inviteReviewer);
  const updateReviewerPermission = useMutation(api.sharing.updateReviewerPermission);
  const removeReviewer = useMutation(api.sharing.removeReviewer);
  const updateShareLinkPermission = useMutation(api.sharing.updateShareLinkPermission);

  // Loading state
  const isLoading = reviewers === undefined || shareLinkSettings === undefined;

  // ...
}
```

### Owner Check Pattern

```typescript
// In ArtifactHeader.tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ArtifactHeader({ artifact }: ArtifactHeaderProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const isOwner = currentUser?._id === artifact.userId;

  return (
    <header>
      {/* ... other header content ... */}
      {isOwner && (
        <Button variant="outline" onClick={() => setShareModalOpen(true)}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      )}
    </header>
  );
}
```

### Toast Notifications

```typescript
import { useToast } from "@/hooks/use-toast";

// In component
const { toast } = useToast();

// On success
toast({
  title: "Reviewer invited",
  description: `${email} has been invited to review.`,
});

// On error
toast({
  variant: "destructive",
  title: "Failed to invite",
  description: error.message,
});
```

---

## Real-Time Updates

Convex automatically provides real-time updates. When a mutation succeeds:

1. The mutation updates the database
2. Convex pushes the change to all connected clients
3. `useQuery` hooks automatically re-render with new data

No additional code needed for real-time - just use standard `useQuery` and `useMutation` patterns.

---

## Error Handling Strategy

| Error Type | UI Response |
|------------|-------------|
| Network error | Toast: "Network error. Please try again." |
| Duplicate email | Toast: "This email has already been invited." |
| Invalid email | Inline form error: "Please enter a valid email." |
| Not owner | Toast: "You don't have permission to share this artifact." |
| Not found | Toast: "Reviewer not found." |

---

## References

- **Implementation Plan:** `01-share-button-planning/IMPLEMENTATION-PLAN.md`
- **Architecture:** `01-share-button-planning/ARCHITECTURE.md`
- **Subtask 02:** `02-schema-backend-foundation/README.md` (backend contract)
- **Subtask 03:** `03-sharemodal-ui-shell/README.md` (UI components)
- **TDD Workflow:** `docs/development/workflow.md`
