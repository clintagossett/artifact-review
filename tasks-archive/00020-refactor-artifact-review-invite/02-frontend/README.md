# Subtask 02: Frontend Implementation

**Parent Task:** 00020-refactor-artifact-review-invite
**Status:** COMPLETE
**Created:** 2026-01-03
**Completed:** 2026-01-06
**Dependencies:** 01-backend (schema and Convex functions must exist)

---

## Objective

Implement the React components, hooks, and utilities to integrate the new invitation system with the ShareModal UI and enable real-time permission handling.

---

## Deliverables

### 1. New Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useReviewers` | `app/src/hooks/useReviewers.ts` | Query `listReviewers`, manage loading state |
| `usePermission` | `app/src/hooks/usePermission.ts` | Query `getPermission`, subscription for real-time changes |

### 2. New Components

| Component | Location | Purpose | Key Props |
|-----------|----------|---------|-----------|
| `ReviewerList` | `app/src/components/artifacts/ReviewerList.tsx` | Display list of reviewers in ShareModal | `artifactId` |
| `ReviewerRow` | `app/src/components/artifacts/ReviewerRow.tsx` | Single reviewer with status, actions | `reviewer, onResend, onRemove` |
| `InviteReviewerForm` | `app/src/components/artifacts/InviteReviewerForm.tsx` | Email input + invite button | `artifactId, onInvited` |

### 3. New Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `deriveReviewerStatus` | `app/src/lib/access.ts` | Derive status from access record |

```typescript
// Status derivation logic
function deriveReviewerStatus(access: ArtifactAccess): "pending" | "added" | "viewed" | "removed" {
  if (access.isDeleted) return "removed";
  if (!access.userId) return "pending";
  if (access.firstViewedAt) return "viewed";
  return "added";
}
```

### 4. Modified Components

| Component | Location | Changes |
|-----------|----------|---------|
| `ShareModal` | `app/src/components/artifacts/ShareModal.tsx` | Integrate ReviewerList, InviteReviewerForm, keep existing link sharing |
| `ArtifactViewer` | `app/src/components/artifacts/ArtifactViewer.tsx` | Add `usePermission` subscription, kick-out handler |

---

## Component Specifications

### ReviewerRow

Displays a single reviewer with their status and action buttons.

**Props:**
```typescript
interface ReviewerRowProps {
  reviewer: {
    displayName: string | null;
    email: string;
    status: "pending" | "added" | "viewed";
    accessId: Id<"artifactAccess">;
    sendCount: number;
    lastSentAt: number;
  };
  onResend: (accessId: Id<"artifactAccess">) => void;
  onRemove: (accessId: Id<"artifactAccess">) => void;
}
```

**UI Elements:**
- Avatar/initials
- Display name or email
- Status badge (Pending/Added/Viewed)
- "Resend" button (for pending status)
- "Remove" button (dropdown or icon)

### ReviewerList

Container that fetches and displays all reviewers for an artifact.

**Props:**
```typescript
interface ReviewerListProps {
  artifactId: Id<"artifacts">;
}
```

**Behavior:**
- Uses `useReviewers` hook
- Shows loading skeleton while fetching
- Shows empty state if no reviewers
- Handles resend/remove via mutations

### InviteReviewerForm

Email input with invite functionality.

**Props:**
```typescript
interface InviteReviewerFormProps {
  artifactId: Id<"artifacts">;
  onInvited?: () => void;  // Callback after successful invite
}
```

**Behavior:**
- Email input with validation
- Submit button triggers `grant` mutation
- Shows success toast on invite
- Clears input after successful invite
- Shows error toast on failure

---

## Reactive Permission Handling

### Implementation in ArtifactViewer

```typescript
// Pseudocode for permission handling
const permission = usePermission(artifactId);
const previousPermission = useRef(permission);

useEffect(() => {
  // Only trigger on transition from truthy to null
  if (previousPermission.current && permission === null) {
    // Save draft comment to sessionStorage
    if (draftComment) {
      sessionStorage.setItem('draft-comment', draftComment);
    }

    // Show toast
    toast.error("Your access was revoked");

    // Redirect with slight delay for toast visibility
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  }
  previousPermission.current = permission;
}, [permission]);
```

**Edge Cases:**
- Initial load with null permission: Do NOT trigger kick-out (user may not have access at all)
- In-flight mutations: Allow to complete (acceptable race condition)
- Multiple tabs: Each tab handles its own kick-out

---

## ShadCN Components to Use

| UI Need | ShadCN Component | Notes |
|---------|------------------|-------|
| Reviewer list container | `Card` or existing ShareModal section | |
| Reviewer row layout | Custom flex layout | |
| Status badges | `Badge` | Variants: default, secondary, outline |
| Invite input | `Input` + `Button` | |
| Action dropdown | `DropdownMenu` | For resend/remove actions |
| Loading state | `Skeleton` | |
| Feedback | `Toast` | Success/error messages |
| Confirmation | `AlertDialog` | For remove confirmation |

### Components to Install (if not present)

```bash
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add alert-dialog
```

---

## Implementation Order

1. Create utility `lib/access.ts` with `deriveReviewerStatus`
2. Create hooks:
   - `useReviewers.ts`
   - `usePermission.ts`
3. Create components (bottom-up):
   - `ReviewerRow.tsx`
   - `ReviewerList.tsx`
   - `InviteReviewerForm.tsx`
4. Integrate into `ShareModal.tsx`
5. Add permission subscription to `ArtifactViewer.tsx`
6. Test all scenarios

---

## Validation Scenarios (Frontend Focus)

| # | Scenario | Expected UI Behavior |
|---|----------|---------------------|
| 1 | Owner opens ShareModal | Shows reviewer list + invite form + link sharing |
| 2 | Owner invites email | Toast "Invitation sent", email appears in list as "Pending" |
| 3 | Owner clicks resend | Toast "Invitation resent", sendCount updates |
| 4 | Owner removes reviewer | Confirmation dialog, then removed from list |
| 5 | Reviewer views artifact | Status changes from "Added" to "Viewed" |
| 6 | Pending user signs up | Status changes from "Pending" to "Added" (real-time) |
| 7 | Owner revokes while reviewer viewing | Reviewer sees toast + redirect to dashboard |
| 8 | No reviewers yet | Empty state message |

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file (subtask documentation) |
| `test-report.md` | Test results and implementation summary |
| `tests/unit/access.test.ts` | Utility function tests (4/4 passing) |
| `tests/unit/ReviewerRow.test.tsx` | Component tests (requires jsdom) |
| `tests/unit/InviteReviewerForm.test.tsx` | Component tests (requires jsdom) |

## Implementation Summary

### ✅ Completed

1. **Utility Function:** `app/src/lib/access.ts` with `deriveReviewerStatus` (4 tests passing)
2. **Hooks:**
   - `app/src/hooks/useReviewers.ts` - Query reviewers list
   - `app/src/hooks/usePermission.ts` - Real-time permission subscription
3. **Components:**
   - `app/src/components/artifacts/ReviewerRow.tsx` - Single reviewer with actions
   - `app/src/components/artifacts/ReviewerList.tsx` - List container with mutations
   - `app/src/components/artifacts/InviteReviewerForm.tsx` - Email invitation form
4. **Integrations:**
   - `app/src/components/artifacts/ShareModal.tsx` - Added reviewer management
   - `app/src/components/artifact/ArtifactViewer.tsx` - Added permission subscription + kick-out
5. **ShadCN Components:** Installed `alert-dialog`, using `badge`, `skeleton`, `dropdown-menu`, etc.

### 📝 Test Coverage

- **Unit Tests:** 4/4 passing for utility function
- **Component Tests:** Written (require jsdom environment from `app/` directory)
- **E2E Tests:** Should be created at task level for full flow validation

See `test-report.md` for detailed coverage and next steps.

---

## How This Will Be Used

This subtask depends on `01-backend` providing the Convex functions. The components integrate into the existing ShareModal and ArtifactViewer, adding reviewer management and real-time permission handling.

---

## Accessibility Requirements

- All interactive elements must be keyboard accessible
- Status badges should have aria-labels
- Remove action should have confirmation to prevent accidental deletion
- Toast messages should use appropriate ARIA live regions (handled by toast library)
