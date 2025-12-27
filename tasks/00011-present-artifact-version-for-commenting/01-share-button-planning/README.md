# Subtask 06: Share Button Implementation

**Parent Task:** 00011 - Present Artifact Version for Commenting
**Status:** 🔵 Planning - Awaiting Architect Review
**Created:** 2025-12-27

---

## Overview

Implement the "Share" button and sharing functionality for artifacts, allowing owners to invite reviewers via email or shareable links with permission controls.

This feature enables the core collaboration workflow: artifact owners can share their artifacts with teammates and external reviewers, controlling who can view and who can comment.

---

## Requirements Source

**Figma Design Documentation:** `/figma-designs/SHARE_ARTIFACT.md`

Please read the complete requirements document before planning. Key sections include:
- Permission levels (View Only, View & Comment, Owner)
- User flows (Email invitations, Link sharing, Managing reviewers)
- Share Modal components and UI specifications
- Backend API requirements
- Mock data and state management examples

---

## Scope

### In Scope (MVP: Email Invitations Only)
1. **Backend Implementation**
   - Database schema for reviewers and permissions
   - Convex queries/mutations for:
     - Inviting reviewers by email
     - Managing reviewer permissions (change/remove)
     - Fetching artifact reviewers list
   - Permission validation and authorization
   - Email sending via Resend

2. **Frontend Implementation**
   - Share button in ArtifactViewer header (owner only)
   - ShareModal component with:
     - Email invitation form
     - "People with Access" list
     - Permission management UI (change/remove reviewers)
     - Review permissions info box
   - UnauthenticatedBanner for login prompt
   - Real-time updates when permissions change

3. **Permission System**
   - **Single permission level: "can-comment"** (all invited users can view and comment)
   - Owner-only access control (only owner can share)
   - **Explicit invitation required** (no public links)
   - Authentication required for all access

### Out of Scope (Deferred to Task 00013: Share Links Feature)
- **Public share links** ("Anyone with this link can...")
- **"View-only" permission level** (deferred until public links)
- `shareLinkPermission` field on artifacts table
- ShareLinkSection component
- Copy link button
- Permission dropdowns/badges
- Unauthenticated access

### Out of Scope (Future Enhancements)
- Expiring invitations
- Invitation reminders
- Link analytics
- Usage tracking
- Notification preferences
- Team workspaces
- SSO integration

---

## 🚨 CRITICAL SCOPE BOUNDARIES

### Email Sending: NOT IMPLEMENTED

**What this subtask DOES:**
- ✅ Create `artifactReviewer` record in database
- ✅ Show "Pending" status in ShareModal UI
- ✅ Log mock email to console (for debugging)

**What this subtask does NOT do:**
- ❌ Send actual emails to reviewers
- ❌ Integrate with Resend or any email service
- ❌ Send notification emails

**User Experience:**
1. Owner invites `reviewer@company.com` via ShareModal
2. System creates database record with `status: "pending"`
3. Console logs: `"Would send email to reviewer@company.com..."`
4. Owner sees reviewer in "People with Access" list with "Pending" badge
5. **Reviewer receives NO email** - owner must manually share the link

**Future Work:** Email sending will be added in a separate task using Resend (per ADR 0004).

---

### Commenting: PERMISSION INFRASTRUCTURE ONLY

**What this subtask DOES:**
- ✅ Build permission storage schema (`artifactReviewers` table)
- ✅ Create permission CRUD operations (invite, change, remove)
- ✅ Define "view-only" and "can-comment" permission levels
- ✅ Provide `getUserPermission` query for checking access
- ✅ Enforce owner-only sharing controls

**What this subtask does NOT do:**
- ❌ Implement commenting UI components
- ❌ Create comment database schema
- ❌ Build comment threading logic
- ❌ Implement @mentions system
- ❌ Build resolve/unresolve functionality

**CRITICAL CONSTRAINT: Authentication Required for Commenting**

**All commenting requires authentication.** Unauthenticated users CANNOT comment, even via share links.

**Permission levels and authentication (MVP Simplified):**

| User Type | Access Level | What They Can Do |
|-----------|--------------|------------------|
| **Owner** | Full access | Everything |
| **Invited reviewer (authenticated)** | Can comment | View artifact, read comments, add/reply to comments |
| **Invited reviewer (not logged in)** | None (prompt) | See artifact + "Login to view and comment" banner |
| **Not invited (authenticated)** | None | "Contact artifact creator for access" |
| **Not invited (not logged in)** | None | "Login to view this artifact" |

**Simplified Permission Model:**
- **One permission level:** All invited users get "can-comment" access
- **No public access:** Must be explicitly invited by email
- **Authentication required:** All commenting requires login
- **Forwarded emails:** If someone forwards an invitation, recipient is denied access and shown "Contact artifact creator"

**Relationship to Future Commenting Task:**
This subtask builds the **"who can do what"** foundation. A future task (likely 00012) will build the **"what they can do"** commenting features.

When commenting is implemented, it will require authentication:
```typescript
const userId = await getAuthUserId(ctx);
if (!userId) {
  throw new Error("Must be authenticated to comment");
}

const permission = await ctx.runQuery(api.sharing.getUserPermission, { artifactId });
if (permission === "can-comment" || permission === "owner") {
  // Allow comment creation
}
```

**Clean Separation:** This task provides the permission infrastructure. Commenting features are a separate story.

---

## User Flows to Implement (MVP)

### Flow 1: Invite Reviewer via Email
1. Owner clicks "Share" button in artifact viewer
2. Share modal opens
3. Owner enters email address
4. Owner clicks "Invite" button
5. Email sent to reviewer with artifact link
6. New reviewer appears in "People with Access" list with "Pending" status
7. Reviewer clicks email link → Logs in → Access granted

### Flow 2: Reviewer Accesses Artifact
1. Reviewer receives email invitation
2. Clicks link → Taken to `/a/[shareToken]`
3. If not logged in → Sees "Login to view and comment" banner
4. Logs in (redirected back to artifact)
5. Can now view artifact and add comments

### Flow 3: Remove Reviewer Access
1. Owner opens Share modal
2. Views "People with Access" list
3. Clicks X button next to reviewer
4. Reviewer removed (soft delete)
5. Reviewer can no longer access artifact

---

## Technical Considerations

### Database Schema Needs
Based on the API requirements in SHARE_ARTIFACT.md, we need:

**New Table: `artifactReviewers`**
- `artifactId` (references artifacts)
- `userId` (references users, nullable for pending invitations)
- `email` (for invited users who haven't signed up)
- ~~`permission`~~ **REMOVED** - All invited users get "can-comment" access
- `invitedBy` (references users - the owner)
- `invitedAt` (timestamp)
- `status` ("pending" | "accepted")
- `isDeleted` (soft delete)

**No changes to `artifacts` table needed** (shareToken already exists)

### API Endpoints Required (Simplified)

Convex queries/mutations needed:
- `sharing.inviteReviewer` - Invite reviewer by email (sends email)
- `sharing.getReviewers` - List all reviewers (owner only)
- ~~`sharing.updateReviewerPermission`~~ **REMOVED** - No permission changes
- `sharing.removeReviewer` - Remove reviewer (soft delete)
- `sharing.getUserPermission` - Check if user has access
- `sharing.linkPendingInvitations` - Link invitations on signup (internal)
- `sharing.sendInvitationEmail` - Send email via Resend (action)

### Frontend Components (Simplified)

**New Component:** `ShareModal.tsx`
- Location: `app/src/components/artifact/ShareModal.tsx`
- Sections:
  - **Invite Section:** Email input + Invite button (no permission dropdown)
  - **People with Access:** List of reviewers with Remove button (no permission badge)
  - **Permissions Info:** Explanation of "can-comment" access
- Uses ShadCN: Dialog, Input, Button (no Select needed)

**New Component:** `UnauthenticatedBanner.tsx`
- Shows "Login to view and comment" for unauthenticated users
- Redirects to login with `returnTo` parameter

**Updates Required:**
- `ArtifactViewerPage.tsx` - Add Share button, integrate UnauthenticatedBanner
- `ArtifactHeader.tsx` - Add Share button (owner only)

### Permission Enforcement (Simplified)

**Frontend:**
- Show Share button only to artifact owner
- Show UnauthenticatedBanner for non-logged-in users
- Show "Access Denied - Contact Creator" for uninvited logged-in users

**Backend:**
- Validate ownership before allowing share operations (invite/remove)
- `getUserPermission` returns: "owner", "can-comment", or null
- All invited users have "can-comment" access (no permission variations)

---

## Design System References

From SHARE_ARTIFACT.md (lines 312-344):

**Colors:**
- Primary Blue: `#3B82F6`
- Blue badges: `bg-blue-100 text-blue-700`
- Purple badges: `bg-purple-100 text-purple-700`
- Gradient: Blue to Purple

**Icons (lucide-react):**
- Mail, Link, User, Eye, MessageSquare, Copy, Check, X

**Spacing:**
- Modal padding: `1.5rem` (24px)
- Section gap: `1.5rem` (24px)

---

## Acceptance Criteria

### Backend
- [ ] Database schema supports reviewers and permissions
- [ ] Can invite reviewer by email with permission level
- [ ] Can generate shareable link with permission setting
- [ ] Can list all reviewers for an artifact
- [ ] Can change reviewer permission
- [ ] Can remove reviewer access
- [ ] Only artifact owner can perform share operations
- [ ] Share tokens are validated on artifact access
- [ ] Permissions are enforced on API calls

### Frontend
- [ ] Share button appears in artifact viewer header (owner only)
- [ ] Share modal opens when button clicked
- [ ] Can invite user via email input
- [ ] Can select View Only or Can Comment permission
- [ ] Invited users appear in "People with Access" list
- [ ] Can copy shareable link to clipboard
- [ ] "Copied" feedback shows after copying link
- [ ] Can change reviewer permission from dropdown
- [ ] Can remove reviewer with X button
- [ ] Modal shows permission info box
- [ ] All UI matches Figma designs and color scheme
- [ ] Enter key submits invitation
- [ ] Modal is responsive and scrollable

### Integration
- [ ] Share operations update in real-time
- [ ] Permissions take effect immediately
- [ ] Reviewers see artifact based on their permission level
- [ ] Share links redirect to artifact viewer
- [ ] Mock data can be replaced with real API calls

---

## Testing Strategy

### Unit Tests
- Backend validators for permissions
- Query/mutation logic
- Permission enforcement
- Email validation
- Share token generation

### Component Tests
- ShareModal rendering
- Email invitation flow
- Link copy functionality
- Permission change flow
- Reviewer removal
- Owner-only access

### Integration Tests
- End-to-end share via email flow
- End-to-end share via link flow
- Permission enforcement across routes
- Real-time updates when permissions change

### Manual Validation
- Share modal UI matches Figma
- All interactions work smoothly
- Clipboard copy works in different browsers
- Permission changes are instant
- Only owners see Share button

---

## Dependencies

**Blocks:**
- Task 00012 (Commenting) - Needs permission system to enforce comment capabilities

**Blocked By:**
- Task 00011 (Artifact Viewer) - ✅ Complete

**Related:**
- Authentication system (already implemented)
- Artifact ownership (already in schema)

---

## Architect Tasks

Please analyze the requirements in `/figma-designs/SHARE_ARTIFACT.md` and:

1. **Review the existing codebase:**
   - Current artifact schema (`convex/schema.ts`)
   - Existing authentication and user schema
   - ArtifactViewer component structure

2. **Design the database schema:**
   - Define `artifactReviewers` table
   - Define indexes for efficient queries
   - Plan soft delete strategy
   - Consider share token generation approach

3. **Plan the API layer:**
   - List all Convex queries/mutations needed
   - Define validators for each operation
   - Plan authorization checks
   - Design error handling

4. **Plan the frontend architecture:**
   - Component hierarchy for ShareModal
   - State management approach
   - Real-time update strategy
   - Integration points with ArtifactViewer

5. **Create implementation phases:**
   - Break work into digestible subtasks for TDD agents
   - Identify which phases can be done in parallel
   - Define clear interfaces between backend and frontend work
   - Specify test coverage requirements for each phase

6. **Output:**
   - Create `ARCHITECTURE.md` in this subtask directory
   - Create `IMPLEMENTATION-PLAN.md` with phased breakdown
   - List specific subtasks with clear boundaries
   - Identify parallel work opportunities for TDD agents

---

## Notes

- This is a **core collaboration feature** - quality and UX are critical
- The Figma design is detailed and should be followed closely
- Permission system must be secure (owner-only operations)
- Consider real-time updates when multiple owners collaborate
- Email sending is mocked for now, but API should be ready for integration
- Share links should be short and user-friendly

---

## References

- **Requirements:** `/figma-designs/SHARE_ARTIFACT.md`
- **Parent Task:** `tasks/00011-present-artifact-version-for-commenting/README.md`
- **Design System:** `figma-designs/DESIGN_SYSTEM.md`
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **Development Workflow:** `docs/development/workflow.md`
- **ADR 0010:** `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md` - How pending invitations link to new user accounts (**BLOCKS IMPLEMENTATION**)
