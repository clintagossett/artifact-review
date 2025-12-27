# Share Button Implementation Plan

**Date:** 2025-12-27
**Subtask:** 06 - Share Button Implementation
**Reference:** See `ARCHITECTURE.md` for technical details

---

## Overview

This plan breaks down the Share Button feature into **4 phases** designed for TDD development. Phases 1 and 2 can run **in parallel** since they have no dependencies.

---

## Phase Summary

| Phase | Name | Can Parallelize | Dependencies | Est. Effort |
|-------|------|-----------------|--------------|-------------|
| 1 | Schema & Backend Foundation | Yes | None | Medium |
| 2 | ShareModal UI Shell | Yes | None | Medium |
| 3 | Backend-Frontend Integration | No | Phase 1, 2 | Medium |
| 4 | Polish & E2E Testing | No | Phase 3 | Light |

```
Phase 1 (Backend)     Phase 2 (Frontend Shell)
      |                        |
      +------------------------+
                  |
            Phase 3 (Integration)
                  |
            Phase 4 (Polish)
```

---

## Phase 1: Schema & Backend Foundation

**Goal:** Implement database schema and all Convex queries/mutations with full test coverage.

**Can run in parallel with Phase 2**

### Tasks

#### 1.1 Schema Updates

**File:** `app/convex/schema.ts`

- [ ] Add `artifactReviewers` table definition
- [ ] Add indexes: `by_artifact`, `by_artifact_active`, `by_artifact_email`, `by_email`, `by_user`
- [ ] Add `shareLinkPermission` field to `artifacts` table

**Schema Addition:**

```typescript
// Add to schema.ts
artifactReviewers: defineTable({
  artifactId: v.id("artifacts"),
  email: v.string(),
  userId: v.union(v.id("users"), v.null()),
  permission: v.union(v.literal("view-only"), v.literal("can-comment")),
  invitedBy: v.id("users"),
  invitedAt: v.number(),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_active", ["artifactId", "isDeleted"])
  .index("by_artifact_email", ["artifactId", "email"])
  .index("by_email", ["email"])
  .index("by_user", ["userId"]),

// Update artifacts table - add field:
shareLinkPermission: v.optional(v.union(
  v.literal("view-only"),
  v.literal("can-comment"),
  v.null()
)),
```

#### 1.2 Create sharing.ts Functions

**File:** `app/convex/sharing.ts`

**Queries:**
- [ ] `getReviewers` - List reviewers for artifact (owner only)
- [ ] `getShareLinkSettings` - Get share token and link permission (owner only)
- [ ] `getUserPermission` - Get current user's permission level

**Mutations:**
- [ ] `inviteReviewer` - Add reviewer by email
- [ ] `updateReviewerPermission` - Change reviewer's permission
- [ ] `removeReviewer` - Soft delete reviewer
- [ ] `updateShareLinkPermission` - Update share link settings

#### 1.3 Tests

**Location:** `tasks/00011-present-artifact-version-for-commenting/06-share-button-implementation/tests/convex/`

**Test Files:**
- `sharing.test.ts` - All sharing function tests

**Test Cases:**

```typescript
// sharing.test.ts
describe("inviteReviewer", () => {
  it("should create reviewer record when owner invites");
  it("should reject when caller is not owner");
  it("should reject duplicate email invitations");
  it("should normalize email to lowercase");
  it("should link to existing user if email matches");
  it("should reject invalid email format");
});

describe("getReviewers", () => {
  it("should return empty array for artifact with no reviewers");
  it("should return all active reviewers");
  it("should exclude soft-deleted reviewers");
  it("should reject when caller is not owner");
  it("should enrich with user data when available");
});

describe("updateReviewerPermission", () => {
  it("should update permission from view-only to can-comment");
  it("should update permission from can-comment to view-only");
  it("should reject when caller is not owner");
  it("should reject when reviewer not found");
});

describe("removeReviewer", () => {
  it("should soft delete reviewer");
  it("should reject when caller is not owner");
  it("should reject when reviewer not found");
});

describe("updateShareLinkPermission", () => {
  it("should enable share link with view-only");
  it("should enable share link with can-comment");
  it("should disable share link when set to null");
  it("should reject when caller is not owner");
});

describe("getUserPermission", () => {
  it("should return 'owner' for artifact creator");
  it("should return permission level for invited reviewer");
  it("should return shareLinkPermission for unauthenticated with valid token");
  it("should return null for user with no access");
});
```

### Acceptance Criteria

- [ ] Schema deploys without errors
- [ ] All mutations enforce owner-only access
- [ ] All queries return correct data
- [ ] 100% test coverage on sharing.ts
- [ ] No use of `filter` (indexes only)

### Deliverables

- `convex/schema.ts` (updated)
- `convex/sharing.ts` (new)
- `tests/convex/sharing.test.ts`
- `test-report.md`

---

## Phase 2: ShareModal UI Shell

**Goal:** Build the enhanced ShareModal UI with mock data, ready for backend integration.

**Can run in parallel with Phase 1**

### Tasks

#### 2.1 Move and Enhance ShareModal

**From:** `app/src/components/artifacts/ShareModal.tsx`
**To:** `app/src/components/artifact/ShareModal.tsx`

**Note:** Keep backward compatibility by re-exporting from old location.

#### 2.2 ShareModal Sections

- [ ] **Header Section**
  - Title: "Share Artifact for Review"
  - Subtitle: "Invite teammates to view and comment on this artifact"
  - Close button (X)

- [ ] **Invite Section**
  - Email input with Mail icon
  - Permission dropdown (View Only / Can Comment)
  - Invite button
  - Enter key support

- [ ] **Reviewers Section**
  - "People with Access (N)" header with count
  - Scrollable list of reviewer cards
  - Each card: Avatar, name, email, permission badge, permission dropdown, remove button
  - Empty state when no reviewers

- [ ] **Share Link Section**
  - Gradient background (blue to purple)
  - Read-only link input with Link icon
  - Copy button with "Copied" feedback
  - Permission dropdown: "Anyone with this link can: [permission]"
  - Description text

- [ ] **Permissions Info Box**
  - Blue info panel
  - "Review Permissions" title
  - View Only description
  - Can Comment description
  - Note about reviewer limitations

- [ ] **Footer**
  - Close button

#### 2.3 Sub-Components

**Files to create:**
- `app/src/components/artifact/share/InviteSection.tsx`
- `app/src/components/artifact/share/ReviewerCard.tsx`
- `app/src/components/artifact/share/ReviewersSection.tsx`
- `app/src/components/artifact/share/ShareLinkSection.tsx`
- `app/src/components/artifact/share/PermissionsInfoBox.tsx`

#### 2.4 Mock Data for Development

```typescript
// Mock reviewers for UI development
const mockReviewers = [
  {
    _id: "rev1",
    email: "sarah@company.com",
    permission: "can-comment" as const,
    status: "accepted" as const,
    invitedAt: Date.now() - 86400000,
    user: { name: "Sarah Chen" }
  },
  {
    _id: "rev2",
    email: "mike@company.com",
    permission: "can-comment" as const,
    status: "pending" as const,
    invitedAt: Date.now() - 3600000,
    user: null
  },
  {
    _id: "rev3",
    email: "emma@company.com",
    permission: "view-only" as const,
    status: "accepted" as const,
    invitedAt: Date.now() - 172800000,
    user: { name: "Emma Davis" }
  },
];
```

#### 2.5 Tests

**Location:** `tasks/00011-present-artifact-version-for-commenting/06-share-button-implementation/tests/components/`

**Test Files:**
- `ShareModal.test.tsx`
- `InviteSection.test.tsx`
- `ReviewerCard.test.tsx`
- `ShareLinkSection.test.tsx`

**Test Cases:**

```typescript
// ShareModal.test.tsx
describe("ShareModal", () => {
  it("should render modal title");
  it("should show invite section");
  it("should show reviewers section");
  it("should show share link section");
  it("should show permissions info box");
  it("should close when X button clicked");
  it("should close when Close button clicked");
});

// InviteSection.test.tsx
describe("InviteSection", () => {
  it("should render email input");
  it("should render permission dropdown");
  it("should render invite button");
  it("should call onInvite with email and permission");
  it("should show loading state while inviting");
  it("should show error message on invalid email");
  it("should submit on Enter key");
  it("should clear input after successful invite");
});

// ReviewerCard.test.tsx
describe("ReviewerCard", () => {
  it("should render avatar with initials");
  it("should render name and email");
  it("should render permission badge");
  it("should render pending status for pending invites");
  it("should call onPermissionChange when permission changed");
  it("should call onRemove when X button clicked");
});

// ShareLinkSection.test.tsx
describe("ShareLinkSection", () => {
  it("should render share link input");
  it("should render copy button");
  it("should show 'Copied' feedback after copying");
  it("should render permission dropdown");
  it("should call onPermissionChange when permission changed");
});
```

### Acceptance Criteria

- [ ] ShareModal renders all sections per Figma design
- [ ] All interactions work with mock data
- [ ] Copy to clipboard works
- [ ] Form validation for email
- [ ] All component tests pass
- [ ] Components are accessible (keyboard navigation)

### Deliverables

- `app/src/components/artifact/ShareModal.tsx` (enhanced)
- `app/src/components/artifact/share/*.tsx` (sub-components)
- `tests/components/*.test.tsx`
- `test-report.md`

---

## Phase 3: Backend-Frontend Integration

**Goal:** Connect the UI to the real backend, replacing mock data with Convex queries/mutations.

**Dependencies:** Phase 1 and Phase 2 must be complete

### Tasks

#### 3.1 Replace Mock Data with Queries

**File:** `app/src/components/artifact/ShareModal.tsx`

- [ ] Replace mock reviewers with `useQuery(api.sharing.getReviewers)`
- [ ] Replace mock link settings with `useQuery(api.sharing.getShareLinkSettings)`
- [ ] Add loading states for queries

#### 3.2 Connect Mutations

- [ ] Wire up `inviteReviewer` mutation
- [ ] Wire up `updateReviewerPermission` mutation
- [ ] Wire up `removeReviewer` mutation
- [ ] Wire up `updateShareLinkPermission` mutation

#### 3.3 Add Share Button to ArtifactHeader

**File:** `app/src/components/artifact/ArtifactHeader.tsx`

- [ ] Add Share button (Share2 icon)
- [ ] Only show for artifact owner
- [ ] Wire up to open ShareModal

#### 3.4 Update ArtifactViewer to Support ShareModal

**File:** `app/src/components/artifact/ArtifactViewer.tsx`

- [ ] Add state for ShareModal open/close
- [ ] Pass required props from parent
- [ ] Ensure owner check uses `useQuery(api.users.getCurrentUser)`

#### 3.5 Error Handling

- [ ] Handle mutation errors with toast notifications
- [ ] Handle network errors gracefully
- [ ] Show appropriate loading states

#### 3.6 Tests

**Location:** `tasks/00011-present-artifact-version-for-commenting/06-share-button-implementation/tests/integration/`

**Test Files:**
- `share-flow.test.tsx` - Integration tests with mocked Convex

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
});
```

### Acceptance Criteria

- [ ] Share button visible only to owners
- [ ] Real data loads from Convex
- [ ] All CRUD operations work
- [ ] Real-time updates work
- [ ] Error states handled
- [ ] All integration tests pass

### Deliverables

- Updated `ShareModal.tsx` with real queries/mutations
- Updated `ArtifactHeader.tsx` with Share button
- Updated `ArtifactViewer.tsx` with modal state
- `tests/integration/share-flow.test.tsx`
- `test-report.md`

---

## Phase 4: Polish & E2E Testing

**Goal:** Final polish, accessibility improvements, and end-to-end validation.

**Dependencies:** Phase 3 must be complete

### Tasks

#### 4.1 Accessibility Improvements

- [ ] Add ARIA labels to icon-only buttons
- [ ] Add ARIA live region for "Copied" feedback
- [ ] Ensure focus trap in modal
- [ ] Test keyboard navigation

#### 4.2 Visual Polish

- [ ] Match all colors to design spec
- [ ] Verify gradient styling
- [ ] Test responsive behavior
- [ ] Verify loading skeletons

#### 4.3 Edge Cases

- [ ] Test with 0 reviewers
- [ ] Test with many reviewers (scroll)
- [ ] Test long email addresses
- [ ] Test long artifact titles

#### 4.4 E2E Tests

**Location:** `tasks/00011-present-artifact-version-for-commenting/06-share-button-implementation/tests/e2e/`

**Test Files:**
- `share-artifact.spec.ts`

**Test Cases:**

```typescript
// share-artifact.spec.ts
describe("Share Artifact E2E", () => {
  describe("Owner Flow", () => {
    it("should open share modal from artifact viewer");
    it("should invite reviewer via email");
    it("should copy share link to clipboard");
    it("should change link permission");
    it("should change reviewer permission");
    it("should remove reviewer");
  });

  describe("Non-Owner Flow", () => {
    it("should not show Share button for non-owner");
  });

  describe("Error Handling", () => {
    it("should show error for invalid email");
    it("should show error for duplicate invitation");
  });
});
```

#### 4.5 Validation Video

- [ ] Record Playwright trace of happy path flow
- [ ] Save to `tests/validation-videos/share-artifact-trace.zip`

### Acceptance Criteria

- [ ] All E2E tests pass
- [ ] Accessibility audit passes
- [ ] Visual design matches Figma
- [ ] Validation trace generated
- [ ] All edge cases handled

### Deliverables

- `tests/e2e/share-artifact.spec.ts`
- `tests/validation-videos/share-artifact-trace.zip`
- Final `test-report.md`

---

## Parallel Execution Strategy

### For Two TDD Agents

**Agent A:** Phase 1 (Backend)
**Agent B:** Phase 2 (Frontend Shell)

Both agents can work simultaneously since:
- Phase 1 has no frontend dependencies
- Phase 2 uses mock data, no backend dependencies
- Clear API contract defined in ARCHITECTURE.md

**Handoff Point:** When both complete, Phase 3 begins (single agent recommended for integration work).

### Interface Contract

The interface between Phase 1 and Phase 2 is defined by the query/mutation signatures in ARCHITECTURE.md:

```typescript
// Types that must match between backend and frontend

type Permission = "view-only" | "can-comment";
type ReviewerStatus = "pending" | "accepted";

interface Reviewer {
  _id: Id<"artifactReviewers">;
  email: string;
  userId: Id<"users"> | null;
  permission: Permission;
  status: ReviewerStatus;
  invitedAt: number;
  user?: {
    name?: string;
    email?: string;
  };
}

interface ShareLinkSettings {
  shareToken: string;
  shareLinkPermission: Permission | null;
}
```

---

## Test Infrastructure Setup

Before starting, ensure test infrastructure is in place:

### Convex Tests (Phase 1)

```bash
# From app/ directory
npm install -D convex-test vitest
```

### Component Tests (Phase 2)

```bash
# From app/ directory
npm install -D @testing-library/react @testing-library/user-event vitest jsdom
```

### E2E Tests (Phase 4)

```bash
# From task tests/ directory
cd tasks/00011-present-artifact-version-for-commenting/06-share-button-implementation/tests
npm init -y
npm install -D @playwright/test
npx playwright install chromium
```

---

## Success Criteria Summary

| Phase | Key Metrics |
|-------|-------------|
| 1 | All backend tests pass, schema deploys, indexes work |
| 2 | UI matches Figma, component tests pass, mock data works |
| 3 | Real data flows, CRUD works, real-time updates work |
| 4 | E2E passes, accessibility passes, trace captured |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema migration issues | Test in dev environment first |
| Real-time update complexity | Convex handles this natively |
| Clipboard API browser support | Already tested in existing ShareModal |
| Permission enforcement gaps | Comprehensive backend tests |

---

## References

- Architecture: `06-share-button-implementation/ARCHITECTURE.md`
- Requirements: `/figma-designs/SHARE_ARTIFACT.md`
- Convex Rules: `docs/architecture/convex-rules.md`
- TDD Workflow: `docs/development/workflow.md`
