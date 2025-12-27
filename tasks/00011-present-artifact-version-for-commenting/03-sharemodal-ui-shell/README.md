# Subtask 03: ShareModal UI Shell

**Parent Task:** 00011-present-artifact-version-for-commenting
**Status:** OPEN
**Created:** 2025-12-27
**Refined:** 2025-12-27 (Architect review of Figma designs)

---

## Overview

Build the **simplified** ShareModal UI with mock data, ready for backend integration. This subtask creates all the visual components and interactions for the MVP scope (email invitations only, single permission level).

**This subtask can run in parallel with Subtask 02 (Schema & Backend Foundation).**

---

## MVP Scope Summary

Per the planning decisions in `01-share-button-planning/RESUME.md`:

### IN SCOPE (Build These)

| Component | Purpose |
|-----------|---------|
| ShareModal | Main dialog container |
| InviteSection | Email input + Invite button (NO permission dropdown) |
| ReviewerCard | Reviewer display with status badge + Remove button |
| ReviewersSection | List of reviewer cards |
| PermissionsInfoBox | Simple access explanation |
| UnauthenticatedBanner | Login prompt for unauthenticated users |
| AccessDeniedMessage | Error message for logged-in users without access |

### OUT OF SCOPE (Do NOT Build)

| Component | Reason |
|-----------|--------|
| ShareLinkSection | Public links deferred to Task 00013 |
| Permission dropdown (invite form) | Single permission level |
| Permission badge (reviewer card) | Single permission level |
| Permission change dropdown | Single permission level |
| "Anyone with this link..." UI | No public links in MVP |

---

## Goals

1. Build ShareModal component with simplified UI (no share links, no permission dropdowns)
2. Build UnauthenticatedBanner component
3. Build AccessDeniedMessage component
4. Build all sub-components with mock data
5. Achieve full component test coverage

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| None | N/A | Uses mock data, no backend dependencies |

**Blocks:**
- Subtask 04 (Backend-Frontend Integration) - Cannot start until this is complete

---

## Design Specifications (from Figma)

### Color Palette

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Primary Blue | `#2563EB` | `bg-blue-600` | Invite button, CTAs |
| Primary Blue Hover | `#1D4ED8` | `bg-blue-700` | Button hover |
| Info Background | `#EFF6FF` | `bg-blue-50` | Info panels, banners |
| Info Border | `#DBEAFE` | `border-blue-100` | Info panel borders |
| Info Text | `#1E40AF` | `text-blue-800` | Info panel text |
| Success Green | `#10B981` | `text-green-600` | "Accepted" status |
| Warning Amber | `#F59E0B` | `text-amber-600` | "Pending" status |
| Neutral Gray | `#6B7280` | `text-gray-500` | Secondary text |
| Border Gray | `#E5E7EB` | `border-gray-200` | Card borders |
| Background | `#F9FAFB` | `bg-gray-50` | Reviewer card bg |

### Typography

| Element | Classes | Notes |
|---------|---------|-------|
| Modal Title | `text-lg font-semibold text-gray-900` | "Share Artifact for Review" |
| Modal Subtitle | `text-sm text-gray-500` | "Invite teammates..." |
| Section Label | `text-sm font-medium text-gray-900` | "People with Access (N)" |
| Reviewer Name | `text-sm font-medium text-gray-900` | User's display name |
| Reviewer Email | `text-sm text-gray-500` | User's email address |
| Info Box Title | `text-sm font-medium text-blue-800` | "Reviewer Access" |
| Info Box Text | `text-sm text-blue-700` | Explanation text |

### Spacing (8px Grid)

| Element | Spacing | Notes |
|---------|---------|-------|
| Modal Padding | `p-6` (24px) | Internal padding |
| Section Gap | `space-y-6` (24px) | Between sections |
| Reviewer Card Padding | `p-3` (12px) | Card internal padding |
| Reviewer Card Gap | `space-y-2` (8px) | Between cards |
| Input Height | Standard ShadCN | Use Input component default |
| Button Padding | Standard ShadCN | Use Button component default |

### Border Radius

| Element | Radius | Notes |
|---------|--------|-------|
| Modal | `rounded-lg` | Dialog container |
| Info Box | `rounded-lg` | Info panels |
| Reviewer Card | `rounded-md` | User cards |
| Avatar | `rounded-full` | User avatars |
| Badge | `rounded-full` | Status badges |
| Button | `rounded-md` | Action buttons |
| Input | `rounded-md` | Form inputs |

### Shadows

| Element | Shadow | Notes |
|---------|--------|-------|
| Modal | `shadow-lg` | Elevated dialog |
| Reviewer Card | `shadow-sm` (hover) | Subtle elevation on hover |

---

## Component Specifications

### 3.1 ShareModal

**File:** `app/src/components/artifact/ShareModal.tsx`

**Props:**
```typescript
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    _id: string;
    title: string;
    shareToken: string;
  };
  // For mock mode
  initialReviewers?: Reviewer[];
}
```

**Layout:**
```
+-----------------------------------------------+
| Share Artifact for Review               [X]   |
| Invite teammates to view and comment...       |
+-----------------------------------------------+
|                                               |
| [Email input                        ] [Invite]|
|                                               |
| ----------------------------------------      |
|                                               |
| People with Access (3)                        |
|                                               |
| [Avatar] Sarah Chen          [Accepted] [X]  |
|          sarah@company.com                    |
|                                               |
| [Avatar] Mike Johnson        [Pending]  [X]  |
|          mike@company.com                     |
|                                               |
| ----------------------------------------      |
|                                               |
| [i] Reviewer Access                           |
|     Invited reviewers can view the artifact   |
|     and add comments. Reviewers cannot edit   |
|     the artifact or invite others.            |
|                                               |
+-----------------------------------------------+
|                              [Close]          |
+-----------------------------------------------+
```

**Sections:**
1. **Header** - Title, subtitle, close button (X)
2. **Invite Section** - Email input + Invite button
3. **Reviewers Section** - List of reviewer cards with header
4. **Permissions Info Box** - Simple explanation
5. **Footer** - Close button

**States:**
- Default (no reviewers)
- With reviewers
- Invite loading
- Invite error (invalid email)
- Invite success (toast)

---

### 3.2 InviteSection

**File:** `app/src/components/artifact/share/InviteSection.tsx`

**Props:**
```typescript
interface InviteSectionProps {
  onInvite: (email: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}
```

**Design:**
- Email input with Mail icon (left)
- Placeholder: "Enter email address"
- Invite button (primary, blue)
- Button text: "Invite"
- Loading state: Spinner + "Inviting..."
- Error state: Red text below input

**Figma Visual Details:**
- Input: `border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500`
- Button: `bg-blue-600 hover:bg-blue-700 text-white`
- Layout: Flexbox, gap-2
- Input grows to fill space: `flex-1`

**Interactions:**
- Enter key submits
- Disabled during loading
- Clear input on success
- Show error inline

**Validation:**
- Email format validation (basic regex)
- Non-empty check

---

### 3.3 ReviewerCard

**File:** `app/src/components/artifact/share/ReviewerCard.tsx`

**Props:**
```typescript
interface ReviewerCardProps {
  reviewer: {
    _id: string;
    email: string;
    status: "pending" | "accepted";
    user?: {
      name?: string;
    } | null;
  };
  onRemove: (id: string) => void;
  isRemoving?: boolean;
}
```

**Design (from Figma):**
```
+-----------------------------------------------+
| [Avatar]  Name/Email        [Status Badge] [X]|
|           email@example.com                   |
+-----------------------------------------------+
```

**Visual Details:**
- Card: `bg-gray-50 hover:bg-gray-100 rounded-md p-3 transition-colors`
- Avatar: `h-10 w-10 rounded-full` with gradient background
- Avatar initials: First letter(s) of name or email
- Avatar gradients: Consistent per-user (hash email to color)
- Name: `text-sm font-medium text-gray-900`
- Email: `text-sm text-gray-500`
- Remove button: Ghost variant, icon-only (X), `text-gray-400 hover:text-gray-600`

**Status Badges (Simplified - NO permission badge):**

| Status | Badge Style | Text |
|--------|-------------|------|
| Pending | `bg-amber-100 text-amber-800 border border-amber-200` | "Pending" |
| Accepted | `bg-green-100 text-green-800 border border-green-200` | "Accepted" |

**Interactions:**
- Hover: Background color change
- Remove: Confirmation not needed (can undo via re-invite)
- Loading state on remove (spinner replaces X)

---

### 3.4 ReviewersSection

**File:** `app/src/components/artifact/share/ReviewersSection.tsx`

**Props:**
```typescript
interface ReviewersSectionProps {
  reviewers: Reviewer[];
  onRemove: (id: string) => void;
  isRemovingId?: string | null;
}
```

**Design:**
- Header: "People with Access (N)" - count in parentheses
- Scrollable area if > 4 reviewers: `max-h-64 overflow-y-auto`
- Empty state: "No reviewers yet. Invite someone to get started."

**Visual Details:**
- Header: `text-sm font-medium text-gray-900 mb-3`
- List container: `space-y-2`
- Scroll container: `max-h-64 overflow-y-auto pr-1` (padding for scrollbar)
- Empty state: `text-sm text-gray-500 text-center py-8`

---

### 3.5 PermissionsInfoBox

**File:** `app/src/components/artifact/share/PermissionsInfoBox.tsx`

**Props:**
```typescript
interface PermissionsInfoBoxProps {
  // No props needed - static content
}
```

**Design (Simplified for MVP):**
```
+-----------------------------------------------+
| [i]  Reviewer Access                          |
|                                               |
|      Invited reviewers can view the artifact  |
|      and add comments.                        |
|                                               |
|      Reviewers cannot edit the artifact or    |
|      invite others.                           |
+-----------------------------------------------+
```

**Visual Details:**
- Container: `bg-blue-50 border border-blue-100 rounded-lg p-4`
- Icon: Info icon (Lucide `Info`), `text-blue-600 h-5 w-5`
- Title: `text-sm font-medium text-blue-800`
- Description: `text-sm text-blue-700`
- Layout: Flex with icon, content in column

**Content (Simplified):**
- Title: "Reviewer Access"
- Line 1: "Invited reviewers can view the artifact and add comments."
- Line 2: "Reviewers cannot edit the artifact or invite others."

**REMOVED from Full Design:**
- View Only vs Can Comment descriptions
- Permission icons next to descriptions
- Complex permission hierarchy explanation

---

### 3.6 UnauthenticatedBanner

**File:** `app/src/components/artifact/UnauthenticatedBanner.tsx`

**Purpose:** Show login prompt for unauthenticated users who arrive via email invitation links.

**Props:**
```typescript
interface UnauthenticatedBannerProps {
  shareToken: string;
}
```

**Design (from Figma SHARED_ARTIFACT_AUTHENTICATION_FLOW.md):**
```
+-----------------------------------------------+
| [Lock]  Sign in to view and comment           |
|                                               |
|         You've been invited to review this    |
|         artifact. Sign in to continue.        |
|                                               |
|                           [Sign In to Review] |
+-----------------------------------------------+
```

**Visual Details:**
- Container: `bg-blue-50 border border-blue-200 rounded-lg p-6`
- Icon: Lock icon, `text-blue-600 h-6 w-6`
- Title: `text-base font-medium text-gray-900`
- Description: `text-sm text-gray-600`
- Button: Primary blue, "Sign In to Review"

**Behavior:**
- Button redirects to: `/login?returnTo=/a/[shareToken]`
- URL encoding: `encodeURIComponent(returnTo)`

**Implementation:**
```typescript
export function UnauthenticatedBanner({ shareToken }: UnauthenticatedBannerProps) {
  const handleSignIn = () => {
    const returnTo = `/a/${shareToken}`;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <Lock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-900">
            Sign in to view and comment
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            You've been invited to review this artifact. Sign in to continue.
          </p>
          <Button
            onClick={handleSignIn}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Sign In to Review
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

### 3.7 AccessDeniedMessage

**File:** `app/src/components/artifact/AccessDeniedMessage.tsx`

**Purpose:** Show error message for logged-in users who do not have access (e.g., someone forwarded them an email invitation not meant for them).

**Props:**
```typescript
interface AccessDeniedMessageProps {
  artifactTitle?: string;
}
```

**Design (from Figma ACCESS_DENIED_DEMO.md):**
```
+-----------------------------------------------+
|                                               |
|              [Lock Icon - Large]              |
|                                               |
|            You don't have access              |
|                                               |
|     to "Artifact Title" (if provided)         |
|                                               |
|   Contact the artifact owner to request       |
|   access to this artifact.                    |
|                                               |
|            [Back to Dashboard]                |
|                                               |
+-----------------------------------------------+
```

**Visual Details:**
- Container: Full page centered, `max-w-md mx-auto mt-16 p-8`
- Card: `bg-white border border-gray-200 rounded-lg shadow-sm`
- Lock icon: `h-12 w-12 text-gray-400 mx-auto`
- Title: `text-xl font-semibold text-gray-900 text-center mt-4`
- Artifact title: `text-sm text-gray-600 text-center mt-2`
- Description: `text-sm text-gray-500 text-center mt-4`
- Button: Secondary/outline variant, centered

**Behavior:**
- "Back to Dashboard" navigates to `/dashboard`
- Shown when user is authenticated but `getUserPermission` returns null

**Implementation:**
```typescript
export function AccessDeniedMessage({ artifactTitle }: AccessDeniedMessageProps) {
  const router = useRouter();

  return (
    <div className="max-w-md mx-auto mt-16 p-8">
      <Card className="text-center">
        <CardContent className="pt-8 pb-8">
          <Lock className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 mt-4">
            You don't have access
          </h2>
          {artifactTitle && (
            <p className="text-sm text-gray-600 mt-2">
              to "{artifactTitle}"
            </p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Contact the artifact owner to request access to this artifact.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="mt-6"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## ShadCN Components Required

All required components are **already installed**:

| Component | File | Status |
|-----------|------|--------|
| Dialog | `app/src/components/ui/dialog.tsx` | Installed |
| Button | `app/src/components/ui/button.tsx` | Installed |
| Input | `app/src/components/ui/input.tsx` | Installed |
| Badge | `app/src/components/ui/badge.tsx` | Installed |
| Avatar | `app/src/components/ui/avatar.tsx` | Installed |
| Card | `app/src/components/ui/card.tsx` | Installed |
| Scroll Area | `app/src/components/ui/scroll-area.tsx` | Installed |
| Tooltip | `app/src/components/ui/tooltip.tsx` | Installed |

**No new ShadCN components needed.**

---

## Lucide Icons Used

| Icon | Import | Usage |
|------|--------|-------|
| `Mail` | `lucide-react` | Email input |
| `X` | `lucide-react` | Close modal, remove reviewer |
| `Lock` | `lucide-react` | UnauthenticatedBanner, AccessDeniedMessage |
| `Info` | `lucide-react` | PermissionsInfoBox |
| `Loader2` | `lucide-react` | Loading spinner (animated) |
| `UserPlus` | `lucide-react` | Invite button (optional enhancement) |

---

## Mock Data for Development

```typescript
// Mock reviewers for UI development
const mockReviewers: Reviewer[] = [
  {
    _id: "rev1",
    email: "sarah@company.com",
    status: "accepted" as const,
    invitedAt: Date.now() - 86400000, // 1 day ago
    user: { name: "Sarah Chen" }
  },
  {
    _id: "rev2",
    email: "mike@company.com",
    status: "pending" as const,
    invitedAt: Date.now() - 3600000, // 1 hour ago
    user: null
  },
  {
    _id: "rev3",
    email: "emma@company.com",
    status: "accepted" as const,
    invitedAt: Date.now() - 172800000, // 2 days ago
    user: { name: "Emma Davis" }
  },
];
```

---

## Interface Contract (Simplified for MVP)

```typescript
// No permission field - all reviewers get "can-comment" implicitly
type ReviewerStatus = "pending" | "accepted";

interface Reviewer {
  _id: string; // Id<"artifactReviewers"> in real implementation
  email: string;
  userId?: string | null;
  status: ReviewerStatus;
  invitedAt: number;
  user?: {
    name?: string;
  } | null;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    _id: string;
    title: string;
    shareToken: string;
  };
  // For mock mode
  initialReviewers?: Reviewer[];
}
```

**REMOVED from interface:**
- `permission` field on Reviewer
- `shareLinkPermission` on artifact
- Any share link related props

---

## Component Hierarchy

```
ShareModal
├── DialogHeader
│   ├── DialogTitle ("Share Artifact for Review")
│   ├── DialogDescription (subtitle)
│   └── X Button (close)
├── InviteSection
│   ├── Input (email, with Mail icon)
│   └── Button ("Invite")
├── Separator
├── ReviewersSection
│   ├── Header ("People with Access (N)")
│   └── ScrollArea
│       └── ReviewerCard[] (mapped)
│           ├── Avatar
│           ├── Name/Email
│           ├── StatusBadge
│           └── RemoveButton (X)
├── Separator
├── PermissionsInfoBox
│   ├── Info Icon
│   ├── Title
│   └── Description
└── DialogFooter
    └── Button ("Close")

UnauthenticatedBanner (separate component)
├── Lock Icon
├── Title
├── Description
└── Button ("Sign In to Review")

AccessDeniedMessage (separate component)
├── Card
│   ├── Lock Icon
│   ├── Title
│   ├── Artifact Title (optional)
│   ├── Description
│   └── Button ("Back to Dashboard")
```

---

## States and Interactions

### ShareModal States

| State | Condition | UI Change |
|-------|-----------|-----------|
| Default | Modal open, no reviewers | Empty state message |
| With Reviewers | Has reviewers | Reviewer list shown |
| Invite Loading | Sending invitation | Button spinner, disabled |
| Invite Error | Invalid email | Red error text below input |
| Invite Success | Invitation sent | Toast notification, input cleared |
| Remove Loading | Removing reviewer | X becomes spinner |

### Keyboard Interactions

| Key | Action |
|-----|--------|
| Enter (in email input) | Submit invitation |
| Escape | Close modal |
| Tab | Navigate focusable elements |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Focus trap | Dialog component handles this |
| Aria labels | Close button: "Close share modal" |
| Role | Dialog with modal role |
| Focus on open | First focusable element (email input) |
| Error announcement | aria-describedby for error messages |
| Status badges | Include aria-label for screen readers |

---

## Test Cases

**Location:** `tasks/00011-present-artifact-version-for-commenting/03-sharemodal-ui-shell/tests/`

### ShareModal.test.tsx

```typescript
describe("ShareModal", () => {
  it("should render modal with correct title");
  it("should render subtitle text");
  it("should close when X button clicked");
  it("should close when Close button clicked");
  it("should close when Escape pressed");
  it("should show InviteSection");
  it("should show ReviewersSection");
  it("should show PermissionsInfoBox");
  it("should show empty state when no reviewers");
  it("should show reviewer count in header");
});
```

### InviteSection.test.tsx

```typescript
describe("InviteSection", () => {
  it("should render email input with placeholder");
  it("should render Invite button");
  it("should call onInvite with email when button clicked");
  it("should call onInvite when Enter pressed in input");
  it("should show loading state while inviting");
  it("should disable input and button while loading");
  it("should show error message for invalid email");
  it("should clear input after successful invite");
  it("should validate email format");
});
```

### ReviewerCard.test.tsx

```typescript
describe("ReviewerCard", () => {
  it("should render avatar with initials");
  it("should render user name when available");
  it("should render email");
  it("should render 'Pending' badge for pending status");
  it("should render 'Accepted' badge for accepted status");
  it("should call onRemove when X button clicked");
  it("should show loading state while removing");
});
```

### ReviewersSection.test.tsx

```typescript
describe("ReviewersSection", () => {
  it("should render header with reviewer count");
  it("should render list of reviewer cards");
  it("should show empty state when no reviewers");
  it("should be scrollable when many reviewers");
});
```

### PermissionsInfoBox.test.tsx

```typescript
describe("PermissionsInfoBox", () => {
  it("should render info icon");
  it("should render 'Reviewer Access' title");
  it("should render description about viewing and commenting");
  it("should render note about not editing or inviting");
});
```

### UnauthenticatedBanner.test.tsx

```typescript
describe("UnauthenticatedBanner", () => {
  it("should render lock icon");
  it("should render sign in message");
  it("should render Sign In to Review button");
  it("should redirect to login with returnTo when clicked");
  it("should encode shareToken in returnTo URL");
});
```

### AccessDeniedMessage.test.tsx

```typescript
describe("AccessDeniedMessage", () => {
  it("should render lock icon");
  it("should render 'You don't have access' heading");
  it("should render artifact title when provided");
  it("should not render artifact title when not provided");
  it("should render contact message");
  it("should render Back to Dashboard button");
  it("should navigate to dashboard when button clicked");
});
```

---

## Acceptance Criteria

- [ ] ShareModal renders all sections per design specs
- [ ] InviteSection handles email input and validation
- [ ] ReviewerCard displays user info and status badge correctly
- [ ] ReviewersSection shows list with count and handles empty state
- [ ] PermissionsInfoBox displays simplified MVP content
- [ ] UnauthenticatedBanner redirects to login with correct returnTo
- [ ] AccessDeniedMessage displays error and navigation
- [ ] All interactions work with mock data
- [ ] Form validation for email
- [ ] All component tests pass
- [ ] Components are accessible (keyboard navigation, screen readers)
- [ ] Responsive design (works on mobile)

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/artifact/ShareModal.tsx` | Main ShareModal component |
| `app/src/components/artifact/share/InviteSection.tsx` | Email invite sub-component |
| `app/src/components/artifact/share/ReviewerCard.tsx` | Reviewer display sub-component |
| `app/src/components/artifact/share/ReviewersSection.tsx` | Reviewers list sub-component |
| `app/src/components/artifact/share/PermissionsInfoBox.tsx` | Permissions info sub-component |
| `app/src/components/artifact/UnauthenticatedBanner.tsx` | Login prompt banner |
| `app/src/components/artifact/AccessDeniedMessage.tsx` | Access denied message |
| `tasks/.../tests/components/*.test.tsx` | Component test files |
| `tasks/.../test-report.md` | Test coverage report |

---

## References

- **RESUME.md:** `01-share-button-planning/RESUME.md` (MVP scope decisions)
- **Figma Designs:**
  - `figma-designs/SHARE_ARTIFACT.md` (full feature - extract MVP parts)
  - `figma-designs/SHARED_ARTIFACT_AUTHENTICATION_FLOW.md` (auth states)
  - `figma-designs/ACCESS_DENIED_DEMO.md` (access denied screen)
  - `figma-designs/DESIGN_SYSTEM.md` (colors, typography, spacing)
  - `figma-designs/INVITE_SYSTEM.md` (invitation flow details)
- **TDD Workflow:** `docs/development/workflow.md`
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **ADR 0010:** `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md`

---

## Figma Features NOT in MVP (Explicit Exclusions)

These features appear in Figma designs but are **OUT OF SCOPE** for this subtask:

| Figma Feature | Why Excluded | Deferred To |
|---------------|--------------|-------------|
| "Or Share with a Link" section | Public links not in MVP | Task 00013 |
| Copy Link button | Public links not in MVP | Task 00013 |
| Link permission dropdown | Public links not in MVP | Task 00013 |
| "Anyone with this link can..." text | Public links not in MVP | Task 00013 |
| Permission dropdown in invite form | Single permission level | Task 00013 |
| Permission badge on reviewer cards | Single permission level | Task 00013 |
| Permission change dropdown per reviewer | Single permission level | Task 00013 |
| "View Only" vs "Can Comment" icons | Single permission level | Task 00013 |
| Request Access button | Future enhancement | TBD |
| Link expiration settings | Public links not in MVP | Task 00013 |
| Link usage analytics | Public links not in MVP | Task 00013 |

---

## Implementation Notes

1. **Use ShadCN Dialog** for the modal - already installed
2. **Use react-hook-form** if available, otherwise useState for form state
3. **Avatar color** - hash email to deterministic gradient color
4. **Mock delays** - simulate API latency (500-1000ms) for loading states
5. **Toast notifications** - use existing toast system for success/error feedback
6. **Deep linking** - UnauthenticatedBanner uses window.location for full page redirect

---

## Next Steps After Completion

1. **Subtask 04:** Integrate with backend API (replace mock data with Convex queries/mutations)
2. **Subtask 04:** Wire up real invitation flow
3. **Subtask 04:** Implement deep linking in auth callback
4. **Subtask 05:** E2E testing of full flow
