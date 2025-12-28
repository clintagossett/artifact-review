# Subtask 2.5: Backend Tests

**Parent:** Phase 2 - Build Backend
**Status:** Not Started
**Prerequisites:** All other Phase 2 subtasks

---

## Objective

Write comprehensive unit tests for all comment and text edit queries and mutations, including permission scenarios.

---

## Deliverables

- [ ] Unit tests for all queries
- [ ] Unit tests for all mutations
- [ ] Permission test scenarios
- [ ] Edge case tests
- [ ] All tests passing

---

## Test Structure

```
tasks/00017-implement-commenting/02-phase-2-backend/05-tests/
├── unit/
│   ├── comments.test.ts
│   ├── textEdits.test.ts
│   └── permissions.test.ts
└── README.md (this file)
```

---

## Test Coverage

### Comments Tests (`comments.test.ts`)

#### Query: `getByVersion`
- [ ] Returns empty array when no comments
- [ ] Returns all comments for a version
- [ ] Includes author information
- [ ] Nests replies correctly
- [ ] Filters by version (doesn't return other versions' comments)

#### Mutation: `create`
- [ ] Creates comment with text target
- [ ] Creates comment with element target
- [ ] Requires authentication
- [ ] Enforces `can-comment` permission
- [ ] Returns comment ID

#### Mutation: `addReply`
- [ ] Adds reply to existing comment
- [ ] Links to parent comment correctly
- [ ] Requires authentication
- [ ] Enforces permissions

#### Mutation: `toggleResolved`
- [ ] Toggles resolved from false to true
- [ ] Toggles resolved from true to false
- [ ] Requires authentication
- [ ] Enforces permissions

#### Mutation: `delete`
- [ ] Author can delete own comment
- [ ] Owner can delete any comment
- [ ] Non-author/non-owner cannot delete
- [ ] Deletes all replies (cascade)

---

### Text Edits Tests (`textEdits.test.ts`)

#### Query: `getByVersion`
- [ ] Returns empty array when no edits
- [ ] Returns all text edits for a version
- [ ] Includes author information
- [ ] Filters by version

#### Mutation: `create`
- [ ] Creates "replace" type edit
- [ ] Creates "delete" type edit
- [ ] Validates newText required for "replace"
- [ ] Requires authentication
- [ ] Enforces `can-comment` permission

#### Mutation: `accept`
- [ ] Owner can accept pending edit
- [ ] Non-owner cannot accept
- [ ] Cannot accept already accepted edit
- [ ] Cannot accept rejected edit

#### Mutation: `reject`
- [ ] Owner can reject pending edit
- [ ] Non-owner cannot reject
- [ ] Cannot reject already rejected edit
- [ ] Cannot reject accepted edit

#### Mutation: `delete`
- [ ] Author can delete own edit
- [ ] Non-author cannot delete
- [ ] Can delete at any status

---

### Permission Tests (`permissions.test.ts`)

#### Authentication
- [ ] Unauthenticated users cannot create comments
- [ ] Unauthenticated users cannot create text edits
- [ ] Unauthenticated users cannot modify anything

#### Comment Permissions
- [ ] `view-only` users cannot comment
- [ ] `can-comment` users can create comments
- [ ] `owner` users can create comments
- [ ] `owner` can delete any comment
- [ ] Non-owner can only delete own comments

#### Text Edit Permissions
- [ ] `view-only` users cannot create edits
- [ ] `can-comment` users can create edits
- [ ] Only `owner` can accept edits
- [ ] Only `owner` can reject edits
- [ ] Authors can delete own edits

---

## Edge Cases

- [ ] Deleting non-existent comment returns error
- [ ] Replying to non-existent comment returns error
- [ ] Creating comment on deleted version returns error
- [ ] Invalid version ID returns error
- [ ] Invalid user ID returns error

---

## Testing Guide

Follow project testing standards:
- Use central test samples from `/samples/` (if applicable)
- Use structured logging (not `console.log`)
- See `docs/development/testing-guide.md`

---

## References

- **Testing Guide:** `docs/development/testing-guide.md`
- **Convex Testing:** Convex docs on testing
- **Existing Tests:** Look for other Convex test examples in the codebase
