# Subtask 3.3: Integration Testing

**Parent:** Phase 3 - Connect Frontend to Backend
**Status:** Not Started
**Prerequisites:** Subtask 3.2 (Wire Data)

---

## Objective

Write comprehensive end-to-end tests for the complete commenting feature, including all user flows and permission scenarios.

---

## Deliverables

- [ ] E2E tests for full commenting flow
- [ ] Permission scenario tests
- [ ] Real-time update tests
- [ ] Validation video showing complete feature
- [ ] Test report documenting coverage
- [ ] All tests passing

---

## Test Structure

```
tasks/00017-implement-commenting/03-phase-3-integration/03-testing/
├── e2e/
│   ├── commenting-flow.test.ts
│   ├── text-edits-flow.test.ts
│   ├── permissions.test.ts
│   └── real-time-updates.test.ts
├── validation-videos/
│   └── commenting-feature-walkthrough.mp4
├── test-report.md
└── README.md (this file)
```

---

## Test Coverage

### Commenting Flow (`commenting-flow.test.ts`)

- [ ] **Create comment on text**
  - Select text in artifact
  - Click comment tool
  - Enter comment content
  - Verify comment appears in sidebar

- [ ] **Create comment on element**
  - Click element tool
  - Click element in artifact
  - Enter comment content
  - Verify comment appears in sidebar

- [ ] **Reply to comment**
  - Click reply on existing comment
  - Enter reply content
  - Verify reply appears nested

- [ ] **Toggle resolved status**
  - Click resolve on comment
  - Verify checkmark appears
  - Click again to unresolve
  - Verify checkmark disappears

- [ ] **Filter comments**
  - Toggle to "Resolved" filter
  - Verify only resolved comments show
  - Toggle to "Unresolved" filter
  - Verify only unresolved comments show

- [ ] **Delete comment**
  - Click delete on own comment
  - Verify comment disappears
  - Verify replies are also deleted

---

### Text Edits Flow (`text-edits-flow.test.ts`)

- [ ] **Create replace text edit**
  - Select text in artifact
  - Click text edit tool
  - Choose "Replace" option
  - Enter original and new text
  - Enter comment
  - Verify edit appears in sidebar

- [ ] **Create delete text edit**
  - Select text in artifact
  - Click text edit tool
  - Choose "Delete" option
  - Enter comment
  - Verify edit appears in sidebar

- [ ] **Accept text edit (as owner)**
  - Log in as owner
  - Click accept on pending edit
  - Verify status changes to "accepted"
  - Verify badge shows "Accepted"

- [ ] **Reject text edit (as owner)**
  - Log in as owner
  - Click reject on pending edit
  - Verify status changes to "rejected"
  - Verify badge shows "Rejected"

- [ ] **Delete text edit (as author)**
  - Log in as author
  - Click delete on own edit
  - Verify edit disappears

---

### Permissions Tests (`permissions.test.ts`)

- [ ] **View-only cannot comment**
  - Log in as view-only user
  - Verify comment tools are disabled
  - Verify cannot create comments

- [ ] **Can-comment can create**
  - Log in as can-comment user
  - Verify can create comments
  - Verify can create text edits
  - Verify cannot accept/reject edits

- [ ] **Owner can do everything**
  - Log in as owner
  - Verify can create comments
  - Verify can accept/reject edits
  - Verify can delete any comment

- [ ] **Author can delete own**
  - Log in as comment author
  - Verify can delete own comments
  - Verify cannot delete others' comments

- [ ] **Unauthenticated cannot access**
  - Log out
  - Navigate to artifact
  - Verify redirected or tools disabled

---

### Real-Time Updates (`real-time-updates.test.ts`)

- [ ] **New comment appears immediately**
  - Create comment
  - Verify appears without page refresh

- [ ] **Optimistic UI updates**
  - Create comment
  - Verify appears immediately (optimistic)
  - Verify persists after server confirms

- [ ] **Mutation errors handled gracefully**
  - Simulate permission error
  - Verify error toast appears
  - Verify optimistic update reverted

---

## Validation Video Requirements

**Location:** `validation-videos/commenting-feature-walkthrough.mp4`

**Must show:**
1. Navigate to shared artifact
2. Create text comment
3. Create element comment
4. Reply to comment
5. Toggle resolved status
6. Filter comments (all/resolved/unresolved)
7. Create replace text edit
8. Accept text edit (as owner)
9. Create delete text edit
10. Reject text edit (as owner)
11. Delete own comment
12. Tool mode switching (comment ↔ text edit)
13. Badge mode switching (one-shot ↔ infinite)
14. Permission checks (show disabled UI for view-only)

**Duration:** 3-5 minutes

---

## Test Report

**Location:** `test-report.md`

**Sections:**
1. **Executive Summary** - Feature complete, all tests passing
2. **Test Coverage** - List all test cases with pass/fail
3. **Known Issues** - Any bugs or limitations
4. **Performance Notes** - Loading times, responsiveness
5. **Next Steps** - Future improvements (out of scope items)

---

## Testing Checklist

- [ ] All E2E tests written
- [ ] All tests passing
- [ ] Validation video recorded
- [ ] Test report written
- [ ] No regressions in existing features
- [ ] Performance acceptable (comments load quickly)

---

## Sample Test Data

**Use central samples:** Check if any samples in `/samples/` are suitable for commenting tests. If not, may need to add sample HTML with multiple pages/elements.

---

## References

- **Testing Guide:** `docs/development/testing-guide.md`
- **Sample Files:** `/samples/README.md`
- **Logging Guide:** `docs/development/logging-guide.md`
