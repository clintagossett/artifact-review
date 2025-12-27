# Share Button Architecture

**Date:** 2025-12-27
**Status:** Proposed
**Subtask:** 06 - Share Button Implementation

---

## Overview

This document defines the technical architecture for the Share Button feature, enabling artifact owners to invite reviewers via email or shareable links with permission controls.

---

## 1. Database Schema Design

### 1.1 New Table: `artifactReviewers`

Stores individual reviewer permissions granted by the artifact owner.

| Field | Type | Validator | Notes |
|-------|------|-----------|-------|
| `_id` | Id | `v.id("artifactReviewers")` | Auto-generated |
| `_creationTime` | number | `v.number()` | Auto-generated |
| `artifactId` | Id<"artifacts"> | `v.id("artifacts")` | Reference to artifact |
| `email` | string | `v.string()` | Reviewer's email (normalized lowercase) |
| `userId` | Id<"users"> or null | `v.union(v.id("users"), v.null())` | Populated when user accepts/signs up |
| `permission` | string | `v.union(v.literal("view-only"), v.literal("can-comment"))` | Permission level |
| `invitedBy` | Id<"users"> | `v.id("users")` | Owner who invited |
| `invitedAt` | number | `v.number()` | Timestamp of invitation |
| `status` | string | `v.union(v.literal("pending"), v.literal("accepted"))` | Invitation status |
| `isDeleted` | boolean | `v.boolean()` | Soft delete flag |
| `deletedAt` | number or undefined | `v.optional(v.number())` | Soft delete timestamp |

### 1.2 Indexes for `artifactReviewers`

| Index Name | Fields | Purpose |
|------------|--------|---------|
| `by_artifact` | `["artifactId"]` | List all reviewers for an artifact |
| `by_artifact_active` | `["artifactId", "isDeleted"]` | List active reviewers for an artifact |
| `by_artifact_email` | `["artifactId", "email"]` | Check for duplicate invitations |
| `by_email` | `["email"]` | Find all artifacts shared with a user by email |
| `by_user` | `["userId"]` | Find all artifacts shared with authenticated user |

### 1.3 Updates to `artifacts` Table

Add field to store share link permission level:

| Field | Type | Validator | Notes |
|-------|------|-----------|-------|
| `shareLinkPermission` | string or null | `v.optional(v.union(v.literal("view-only"), v.literal("can-comment"), v.null()))` | Permission for anyone with share link |

**Note:** The `shareToken` field already exists (nanoid(8)) and will be reused.

---

## 2. Permission Model

### 2.1 Permission Hierarchy

```
Owner (creatorId matches user)
  |
  v
Can Comment (permission: "can-comment")
  |
  v
View Only (permission: "view-only")
  |
  v
No Access (neither owner nor reviewer)
```

### 2.2 Permission Resolution Order

When determining a user's permission for an artifact:

1. **Owner check**: If `artifact.creatorId === userId` -> OWNER
2. **Explicit invitation**: Check `artifactReviewers` for email/userId match -> use stored permission
3. **Share link**: If `artifact.shareLinkPermission` is set and user has share token -> use link permission
4. **Default**: No access

### 2.3 Permission Capabilities Matrix

| Capability | Owner | Can Comment | View Only | No Access |
|------------|-------|-------------|-----------|-----------|
| View artifact | Yes | Yes | Yes | Via share link only |
| Read comments | Yes | Yes | Yes | No |
| Add comments | Yes | Yes | No | No |
| Reply to threads | Yes | Yes | No | No |
| Resolve comments | Yes | Yes (own only) | No | No |
| Manage sharing | Yes | No | No | No |
| Edit artifact | Yes | No | No | No |
| Delete artifact | Yes | No | No | No |

---

## 3. API Layer Design

### 3.1 File Organization

```
convex/
  sharing.ts          # All sharing-related queries and mutations
```

### 3.2 Queries

#### `sharing.getReviewers`

Returns all active reviewers for an artifact.

```typescript
export const getReviewers = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.array(
    v.object({
      _id: v.id("artifactReviewers"),
      email: v.string(),
      userId: v.union(v.id("users"), v.null()),
      permission: v.union(v.literal("view-only"), v.literal("can-comment")),
      status: v.union(v.literal("pending"), v.literal("accepted")),
      invitedAt: v.number(),
      // Enriched user data (if userId exists)
      user: v.optional(v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      })),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Verify caller is owner
    // 2. Fetch active reviewers with index
    // 3. Enrich with user data for accepted invitations
  },
});
```

#### `sharing.getShareLinkSettings`

Returns share link configuration for an artifact.

```typescript
export const getShareLinkSettings = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.object({
    shareToken: v.string(),
    shareLinkPermission: v.union(
      v.literal("view-only"),
      v.literal("can-comment"),
      v.null()
    ),
  }),
  handler: async (ctx, args) => {
    // 1. Verify caller is owner
    // 2. Return shareToken and shareLinkPermission
  },
});
```

#### `sharing.getUserPermission`

Returns the current user's permission level for an artifact.

```typescript
export const getUserPermission = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  returns: v.union(
    v.literal("owner"),
    v.literal("can-comment"),
    v.literal("view-only"),
    v.null()  // No access
  ),
  handler: async (ctx, args) => {
    // 1. Check if owner
    // 2. Check if invited reviewer (by userId or email)
    // 3. Return permission level or null
  },
});
```

### 3.3 Mutations

#### `sharing.inviteReviewer`

Invites a reviewer by email.

```typescript
export const inviteReviewer = mutation({
  args: {
    artifactId: v.id("artifacts"),
    email: v.string(),
    permission: v.union(v.literal("view-only"), v.literal("can-comment")),
  },
  returns: v.id("artifactReviewers"),
  handler: async (ctx, args) => {
    // 1. Verify caller is owner
    // 2. Normalize email (lowercase, trim)
    // 3. Check for duplicate invitation
    // 4. Check if email belongs to existing user
    // 5. Insert artifactReviewer record
    // 6. Return reviewer ID
  },
});
```

#### `sharing.updateReviewerPermission`

Updates a reviewer's permission level.

```typescript
export const updateReviewerPermission = mutation({
  args: {
    reviewerId: v.id("artifactReviewers"),
    permission: v.union(v.literal("view-only"), v.literal("can-comment")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get reviewer record
    // 2. Verify caller is owner of the artifact
    // 3. Update permission
  },
});
```

#### `sharing.removeReviewer`

Removes a reviewer's access (soft delete).

```typescript
export const removeReviewer = mutation({
  args: {
    reviewerId: v.id("artifactReviewers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get reviewer record
    // 2. Verify caller is owner of the artifact
    // 3. Soft delete the reviewer
  },
});
```

#### `sharing.updateShareLinkPermission`

Updates the share link permission level.

```typescript
export const updateShareLinkPermission = mutation({
  args: {
    artifactId: v.id("artifacts"),
    permission: v.union(
      v.literal("view-only"),
      v.literal("can-comment"),
      v.null()  // null = disable share link
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify caller is owner
    // 2. Update shareLinkPermission field
  },
});
```

### 3.4 Authorization Pattern

All owner-only operations follow this pattern:

```typescript
// Standard authorization check
const userId = await getAuthUserId(ctx);
if (!userId) {
  throw new Error("Not authenticated");
}

const artifact = await ctx.db.get(args.artifactId);
if (!artifact) {
  throw new Error("Artifact not found");
}

if (artifact.creatorId !== userId) {
  throw new Error("Not authorized - owner only");
}
```

### 3.5 Error Handling

| Error | HTTP-like Code | Message |
|-------|----------------|---------|
| Not authenticated | 401 | "Not authenticated" |
| Not authorized | 403 | "Not authorized - owner only" |
| Artifact not found | 404 | "Artifact not found" |
| Reviewer not found | 404 | "Reviewer not found" |
| Already invited | 409 | "This email already has access to this artifact" |
| Invalid email | 400 | "Invalid email format" |

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy

```
ArtifactViewerPage
  |
  +-- ArtifactViewer
        |
        +-- ArtifactHeader
        |     |
        |     +-- ShareButton (NEW - owner only)
        |
        +-- ShareModal (ENHANCED)
              |
              +-- InviteSection
              |     |
              |     +-- EmailInput
              |     +-- PermissionSelect
              |     +-- InviteButton
              |
              +-- ReviewersSection
              |     |
              |     +-- ReviewerCard (repeat)
              |           |
              |           +-- Avatar
              |           +-- PermissionBadge
              |           +-- PermissionDropdown
              |           +-- RemoveButton
              |
              +-- ShareLinkSection
              |     |
              |     +-- ShareLinkInput
              |     +-- CopyButton
              |     +-- LinkPermissionSelect
              |
              +-- PermissionsInfoBox
```

### 4.2 ShareModal Component Design

**Location:** `app/src/components/artifact/ShareModal.tsx` (move from `artifacts/`)

**Props:**

```typescript
interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
}
```

**State:**

```typescript
// Invite form state
const [inviteEmail, setInviteEmail] = useState("");
const [invitePermission, setInvitePermission] = useState<"view-only" | "can-comment">("can-comment");
const [inviteError, setInviteError] = useState<string | null>(null);
const [isInviting, setIsInviting] = useState(false);

// Copy link state
const [copied, setCopied] = useState(false);

// Convex queries
const reviewers = useQuery(api.sharing.getReviewers, { artifactId: artifact._id });
const linkSettings = useQuery(api.sharing.getShareLinkSettings, { artifactId: artifact._id });

// Convex mutations
const inviteReviewer = useMutation(api.sharing.inviteReviewer);
const updateReviewerPermission = useMutation(api.sharing.updateReviewerPermission);
const removeReviewer = useMutation(api.sharing.removeReviewer);
const updateShareLinkPermission = useMutation(api.sharing.updateShareLinkPermission);
```

### 4.3 ShadCN Components Required

| Component | Purpose | Status |
|-----------|---------|--------|
| `Dialog` | Modal container | Already installed |
| `Button` | Actions | Already installed |
| `Input` | Email input, link display | Already installed |
| `Select` | Permission dropdowns | Already installed |
| `Badge` | Permission badges | Already installed |
| `Avatar` | Reviewer avatars | Already installed |
| `Separator` | Section dividers | Already installed |
| `ScrollArea` | Scrollable reviewer list | Already installed |
| `Tooltip` | Button hints | Already installed |
| `DropdownMenu` | Permission change dropdown | Already installed |

### 4.4 Real-time Updates

Convex provides real-time updates automatically via `useQuery`. When any mutation modifies the data:

- `reviewers` list updates immediately
- `linkSettings` updates immediately
- No additional WebSocket/polling code needed

### 4.5 Integration with ArtifactHeader

The Share button should only appear for artifact owners:

```typescript
// In ArtifactHeader or ArtifactViewer
const currentUser = useQuery(api.users.getCurrentUser);
const isOwner = currentUser?._id === artifact.creatorId;

// Render Share button only for owners
{isOwner && (
  <Button onClick={() => setShareModalOpen(true)}>
    <Share2 className="h-4 w-4 mr-2" />
    Share
  </Button>
)}
```

---

## 5. URL/Routing Considerations

### 5.1 Existing Routes

| Route | Purpose |
|-------|---------|
| `/a/{shareToken}` | View artifact (latest version) |
| `/a/{shareToken}/v/{versionNumber}` | View specific version |

### 5.2 No New Routes Needed

The share link uses the existing `/a/{shareToken}` route. Permission enforcement happens at the API layer, not routing layer.

---

## 6. Email Invitation (Mock Implementation)

For MVP, email sending is mocked. The system will:

1. Create the `artifactReviewer` record immediately
2. Log the "email that would be sent" to console
3. Show the invitation in the UI as "Pending"

**Future integration point:** An action can be added later to send emails via Resend (per ADR 0004).

```typescript
// Future: convex/sharing.ts
export const sendInvitationEmail = action({
  args: {
    reviewerId: v.id("artifactReviewers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Call Resend API to send invitation email
  },
});
```

---

## 7. Security Considerations

### 7.1 Share Token Security

- Tokens are 8-character nanoid (collision-resistant)
- Tokens are not predictable/guessable
- Share links should be treated as semi-private (security through obscurity)

### 7.2 Authorization Enforcement

- All mutations verify artifact ownership server-side
- Queries for owner-only data verify ownership
- Frontend visibility is "nice to have" but backend is authoritative

### 7.3 Email Normalization

- All emails normalized to lowercase before storage
- Prevents duplicate invitations due to case differences

### 7.4 Rate Limiting (Future)

Consider adding rate limiting to:
- `inviteReviewer` - Prevent spam invitations
- Copy link operations - Not critical but good hygiene

---

## 8. Testing Strategy

### 8.1 Unit Tests (Convex)

| Test Area | Coverage |
|-----------|----------|
| `inviteReviewer` | Valid invite, duplicate detection, owner verification |
| `updateReviewerPermission` | Permission changes, authorization |
| `removeReviewer` | Soft delete, authorization |
| `updateShareLinkPermission` | Enable/disable, permission levels |
| `getReviewers` | Owner-only access, data enrichment |
| `getUserPermission` | Permission resolution order |

### 8.2 Component Tests (React)

| Component | Coverage |
|-----------|----------|
| `ShareModal` | Render, form submission, validation |
| `InviteSection` | Email input, permission selection |
| `ReviewerCard` | Permission display, actions |
| `ShareLinkSection` | Copy functionality, permission toggle |

### 8.3 E2E Tests (Playwright)

| Flow | Coverage |
|------|----------|
| Invite via email | Full flow from button to confirmation |
| Copy share link | Copy and permission change |
| Manage reviewers | Change permission, remove |
| Owner-only access | Non-owners don't see Share button |

---

## 9. Migration Strategy

### 9.1 Schema Migration

The new `artifactReviewers` table is additive - no existing data changes.

The `shareLinkPermission` field on `artifacts` is optional, defaulting to `null` (link sharing disabled by default for security).

### 9.2 Backward Compatibility

- Existing share tokens continue to work
- New `shareLinkPermission` field is optional
- No breaking changes to existing API

---

## 10. Open Questions

1. **Default share link permission:** Should new artifacts have share link enabled by default?
   - **Recommendation:** Disabled by default (null), owner explicitly enables

2. **Self-invitation prevention:** Should owners be able to invite themselves?
   - **Recommendation:** Prevent (silently ignore or error)

3. **Email validation:** How strict should email validation be?
   - **Recommendation:** Basic format check only (no MX lookup)

---

## References

- Requirements: `/figma-designs/SHARE_ARTIFACT.md`
- Convex Rules: `docs/architecture/convex-rules.md`
- Existing Schema: `app/convex/schema.ts`
- Existing ShareModal: `app/src/components/artifacts/ShareModal.tsx`
