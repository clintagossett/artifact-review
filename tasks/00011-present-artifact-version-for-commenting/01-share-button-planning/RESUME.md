# Resume File: Share Button Implementation Planning

**Last Updated:** 2025-12-27
**Status:** ✅ Planning Complete - Ready for Implementation
**ADR:** 0010 (Accepted)

---

## Session Summary

Completed comprehensive planning for Share Button feature (email invitations). Significantly simplified scope from original requirements to focus on MVP essentials.

---

## Major Decisions Made

### 1. Email Invitations Only (No Public Links)
**Original scope:** Share via email OR public links ("Anyone with this link can...")
**Simplified scope:** Email invitations ONLY
**Deferred:** Public share links → Task 00013

**Rationale:** Reduces complexity, focuses MVP on core collaboration workflow

### 2. Single Permission Level
**Original scope:** "view-only" and "can-comment" permissions
**Simplified scope:** All invited users get "can-comment" access
**Deferred:** "View-only" permission → Task 00013 (with public links)

**Rationale:** Eliminates permission dropdowns, badges, and complex UI

### 3. Real Email Sending (Not Mocked)
**Original plan:** Mock email sending (console.log only)
**Final decision:** Implement email sending via Resend NOW
**Deferred:** Nothing - this is critical for MVP

**Rationale:** Without emails, the "invite by email" feature is non-functional

### 4. Deep Linking After Auth
**Decision:** Use query parameter (`?returnTo=/a/shareToken`) for post-auth redirect
**Security:** Validate returnTo parameter (only allow relative URLs)

**Rationale:** Invited users should return to artifact after login, not be dumped on dashboard

---

## Scope Changes Summary

### ❌ Removed from MVP
1. Public share links ("Anyone with this link can...")
2. `shareLinkPermission` field on artifacts table
3. "View-only" permission level
4. Permission dropdowns (in invite form)
5. Permission badges (in reviewer cards)
6. Permission change dropdown (in reviewer list)
7. ShareLinkSection component (copy link, link permissions)
8. Complex permission hierarchy rules

### ✅ Kept in MVP
1. Email invitations by owner
2. Email sending via Resend
3. `artifactReviewers` table (NO permission field - implicit "can-comment")
4. Invite/Remove reviewer operations
5. ShareModal with simplified UI:
   - Invite Section: Email input + Invite button
   - Reviewers Section: List with Remove button
   - Permissions Info Box: Simple explanation
6. UnauthenticatedBanner (login prompt)
7. AccessDeniedMessage (for uninvited users who got forwarded emails)
8. Deep linking (returnTo parameter)
9. Account linking on signup (ADR 0010)

---

## Database Schema (Simplified)

### New Table: `artifactReviewers`
```typescript
artifactReviewers: defineTable({
  artifactId: v.id("artifacts"),
  email: v.string(),
  userId: v.union(v.id("users"), v.null()),
  // NO permission field - all invited users get "can-comment" access
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
  .index("by_user", ["userId"])
```

### No Changes to `artifacts` Table
The existing `shareToken` field is sufficient.

---

## Backend API (Simplified)

### Queries
- `getReviewers` - List all reviewers (owner only)
- `getUserPermission` - Returns "owner", "can-comment", or null

### Mutations
- `inviteReviewer` - Add reviewer by email (triggers email send)
- `removeReviewer` - Soft delete reviewer
- `linkPendingInvitations` - Link invitations on signup (internal)

### Actions
- `sendInvitationEmail` - Send email via Resend (internal)

**REMOVED:**
- ~~`getShareLinkSettings`~~ (no public links)
- ~~`updateReviewerPermission`~~ (no permission changes)
- ~~`updateShareLinkPermission`~~ (no public links)

---

## Frontend Components (Simplified)

### ShareModal (`app/src/components/artifact/ShareModal.tsx`)
**Sections:**
1. Header (title, subtitle, close button)
2. Invite Section (email input + invite button - NO dropdown)
3. Reviewers Section (list with status badge + remove button - NO permission badge/dropdown)
4. Permissions Info Box (simplified explanation)
5. Footer (close button)

**Sub-components:**
- `InviteSection.tsx` - Email input + Invite button
- `ReviewerCard.tsx` - Avatar, name/email, status badge, Remove button
- `ReviewersSection.tsx` - List of reviewer cards
- `PermissionsInfoBox.tsx` - Simple access explanation
- ~~`ShareLinkSection.tsx`~~ - REMOVED

### UnauthenticatedBanner (`app/src/components/artifact/UnauthenticatedBanner.tsx`)
**Purpose:** Login prompt for unauthenticated users
**Message:** "Login to view and comment on this artifact"
**Action:** Redirects to `/login?returnTo=/a/[shareToken]`

### AccessDeniedMessage (`app/src/components/artifact/AccessDeniedMessage.tsx`)
**Purpose:** Error message for logged-in users without access
**When shown:** User is authenticated but `getUserPermission` returns null
**Message:** "You don't have permission to view this artifact. Contact the artifact creator for access."

---

## User Access Scenarios

| Scenario | Auth | Invited | What Happens |
|----------|------|---------|--------------|
| Owner | ✅ | N/A | Full access (view, comment, share) |
| Invited reviewer | ✅ | ✅ | Can view and comment |
| Invited reviewer | ❌ | ✅ | Sees UnauthenticatedBanner → Login → Access granted |
| Not invited (forwarded email) | ✅ | ❌ | Shows AccessDeniedMessage |
| Not invited | ❌ | ❌ | Shows UnauthenticatedBanner → Login → AccessDeniedMessage |

---

## Email Configuration

**Sender:** `notifications@artifactreview-early.xyz`
**Environment Variable:** `NOTIFICATION_FROM_EMAIL`

**Added to:** `app/.env.local.example`

**Email Template:**
- Subject: "You've been invited to review '[Artifact Title]'"
- Body: Inviter name, artifact title, "You've been invited to comment", direct link
- Link: `https://artifactreview.app/a/[shareToken]`

---

## Subtask Status

| Subtask | Status | Ready | Notes |
|---------|--------|-------|-------|
| 01 - Planning | ✅ Complete | N/A | This directory |
| 02 - Backend | ✅ Ready | YES | TDD agent can start |
| 03 - UI Shell | ⏳ Needs refinement | NO | Architect needs to review Figma designs |
| 04 - Integration | ⏳ Blocked | NO | Depends on 02 & 03 |
| 05 - E2E | ⏳ Blocked | NO | Depends on 04 |

### Subtask 02: Backend (READY)
**Blocking:** ADR 0010 - ✅ **ACCEPTED**
**Can start:** YES - TDD agent can begin implementation
**Deliverables:**
- Schema updates (`artifactReviewers` table)
- `convex/sharing.ts` with queries/mutations/actions
- Email template function
- Full test coverage

### Subtask 03: UI Shell (NEEDS REFINEMENT)
**Blocking:** Figma design review
**Next step:** Architect needs to:
1. Read `/figma-designs/SHARE_ARTIFACT.md`
2. Extract MVP components (remove share links, permission dropdowns)
3. Update subtask 03 README with refined specs
4. Create mockups/wireframes if needed

**Why needed:** Figma designs show FULL feature. We need to extract just the MVP parts.

### Subtask 04: Integration
**Blocking:** Subtasks 02 & 03 must complete
**Updates needed:** Remove share link integration tasks

### Subtask 05: E2E Testing
**Blocking:** Subtask 04 must complete
**No changes needed:** E2E tests will naturally focus on what exists

---

## ADR 0010: Accepted ✅

**File:** `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md`

**Key decisions:**
1. **Account Linking:** Use auth hook (Option A from ADR)
2. **Email Sending:** Real implementation via Resend (not mocked)
3. **Deep Linking:** Query parameter approach with validation
4. **MVP Scope:** Email invitations only, single permission level

**Status:** Accepted and documented

---

## Next Steps (Proposed Workflow)

### Immediate (Parallel Execution)

**1. Launch TDD Agent on Backend** (Background)
```bash
# Task tool - subagent: tdd-developer
# Subtask: 02-schema-backend-foundation
# Background: true
```

**Deliverables:**
- `convex/schema.ts` updated
- `convex/sharing.ts` created
- Email template function
- Full test coverage
- `test-report.md`

**2. Launch Architect for Figma Review** (Foreground)
```bash
# Task tool - subagent: architect
# Subtask: 03-sharemodal-ui-shell
```

**Deliverables:**
- Refined UI specifications (remove share links, permission dropdowns)
- Updated subtask 03 README
- Component hierarchy diagram
- Mockups/wireframes if helpful

### Sequential (After Above Complete)

**3. TDD Agent on Frontend** (Subtask 03)
- Build ShareModal with simplified UI
- Build UnauthenticatedBanner
- Build AccessDeniedMessage
- Full component test coverage

**4. TDD Agent on Integration** (Subtask 04)
- Wire up backend to frontend
- Implement deep linking
- Integration tests

**5. TDD Agent on E2E** (Subtask 05)
- End-to-end tests
- Accessibility audit
- Validation video

---

## Key Files Modified

### Documentation
- `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md` - Created & accepted
- `docs/architecture/decisions/_index.md` - Added ADR 0010

### Environment
- `app/.env.local.example` - Added `NOTIFICATION_FROM_EMAIL`

### Task Planning
- `tasks/00011-present-artifact-version-for-commenting/01-share-button-planning/README.md` - Simplified scope
- `tasks/00011-present-artifact-version-for-commenting/01-share-button-planning/ARCHITECTURE.md` - Created by architect
- `tasks/00011-present-artifact-version-for-commenting/01-share-button-planning/IMPLEMENTATION-PLAN.md` - Created by architect

### Subtasks
- `02-schema-backend-foundation/README.md` - Simplified schema, removed share links
- `03-sharemodal-ui-shell/README.md` - Removed ShareLinkSection, added AccessDeniedMessage
- `04-backend-frontend-integration/README.md` - Added UnauthenticatedBanner integration, deep linking
- `05-polish-e2e-testing/README.md` - Updated dependencies

---

## Open Questions / Edge Cases

### Handled
- ✅ Forwarded emails (uninvited user) → Shows AccessDeniedMessage
- ✅ Unauthenticated invitation recipients → UnauthenticatedBanner + deep linking
- ✅ Email domain configuration → `notifications@artifactreview-early.xyz`
- ✅ Permission model → Single level ("can-comment")

### Deferred to Task 00013 (Share Links Feature)
- Public share links
- "View-only" permission
- Permission hierarchies (invitation vs link)
- Link expiration
- Link analytics

### Deferred to Future Tasks
- "Request Access" button
- Email reminders
- Notification preferences
- Bulk invitations

---

## Testing Strategy

### Unit Tests (Backend)
- All sharing.ts functions (mutations, queries, actions)
- Email template rendering
- Permission resolution
- Account linking logic

### Component Tests (Frontend)
- ShareModal and all sub-components
- UnauthenticatedBanner
- AccessDeniedMessage
- Form validation
- Loading states

### Integration Tests
- Full invitation flow (invite → email → login → access)
- Permission enforcement
- Real-time updates
- Error handling

### E2E Tests
- Email invitation flow
- Remove reviewer flow
- Access denied scenarios
- Deep linking after login

---

## Risk Mitigation

| Risk | Mitigation | Status |
|------|------------|--------|
| Scope creep | Strict MVP boundaries documented | ✅ Complete |
| Complex permissions | Simplified to single level | ✅ Complete |
| Email not working | Real Resend integration (not mocked) | ✅ Decided |
| Uninvited access | AccessDeniedMessage + clear error | ✅ Designed |
| Deep linking breaks | Query param validation + tests | ✅ Designed |
| Convex rules violation | Comprehensive backend tests | ⏳ In subtask 02 |

---

## Commands to Resume

### Check Status
```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/tasks/00011-present-artifact-version-for-commenting
ls -la  # See all subtasks
cat 01-share-button-planning/RESUME.md  # This file
```

### Review ADR
```bash
cat /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/docs/architecture/decisions/0010-reviewer-invitation-account-linking.md
```

### Start Backend Implementation
```bash
# Launch TDD agent on subtask 02
# See subtask README: 02-schema-backend-foundation/README.md
```

### Start UI Refinement
```bash
# Launch architect on subtask 03
# Input: /figma-designs/SHARE_ARTIFACT.md
# Output: Refined subtask 03 README
```

---

## Success Criteria (MVP Complete)

- [ ] Owner can invite reviewers via email
- [ ] Email sent with artifact link
- [ ] Invited user clicks link → Logs in → Access granted
- [ ] Invited user can view artifact and comment
- [ ] Uninvited user (forwarded email) sees "Access Denied" message
- [ ] Unauthenticated user sees "Login" banner
- [ ] Deep linking works (login → back to artifact)
- [ ] Owner can remove reviewers
- [ ] All tests passing (unit, component, integration, E2E)

---

## References

- **Requirements:** `/figma-designs/SHARE_ARTIFACT.md` (full feature - extract MVP parts)
- **Parent Task:** `tasks/00011-present-artifact-version-for-commenting/README.md`
- **ADR 0010:** `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md`
- **Convex Rules:** `docs/architecture/convex-rules.md`
- **TDD Workflow:** `docs/development/workflow.md`

---

## Contact / Continuation

When resuming this work:
1. Read this RESUME.md file first
2. Check ADR 0010 status
3. Review subtask status table
4. Launch TDD agent on subtask 02 (backend) in background
5. Launch architect on subtask 03 (UI refinement)

**Last contributor:** Claude Sonnet 4.5
**Session end:** 2025-12-27
