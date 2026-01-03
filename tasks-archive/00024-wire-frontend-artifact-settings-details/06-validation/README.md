# Subtask 06: Validation and Cleanup

**Parent Task:** 00024-wire-frontend-artifact-settings-details
**Status:** Pending
**Estimated Time:** 30 minutes
**Dependencies:** Subtasks 01-05 must be completed first

## Objective

Verify all changes work correctly end-to-end through TypeScript checks, test runs, and manual validation.

---

## Verification Steps

### 1. TypeScript Compilation Check

Run TypeScript compiler to ensure no type errors:

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Full type check
npx tsc --noEmit

# If errors, fix them before proceeding
```

**Expected Result:** No errors

---

### 2. Run All Tests

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Run full test suite
npm test

# If specific tests fail, run them individually with verbose output
npm test -- ArtifactCard.test --verbose
npm test -- ShareModal.test --verbose
npm test -- useArtifactUpload.test --verbose
```

**Expected Result:** All tests pass

---

### 3. Search for Remaining Issues

Check for any remaining `title` references that should be `name`:

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Check for remaining 'title' in artifact-related components (excluding DialogTitle, CardTitle, etc.)
grep -rn "artifact.title\|artifact\.title" src/

# Check for remaining 'title:' in interfaces
grep -rn "title: string" src/components/artifact src/components/artifacts src/hooks

# Check for 'creatorId' references
grep -rn "creatorId" src/
```

**Expected Result:** No results (or only legitimate uses like `DialogTitle`)

---

### 4. Start Dev Servers

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review

# Start development servers
./scripts/start-dev-servers.sh
```

**Expected Result:** Servers start without errors

---

### 5. Manual Testing Checklist

Open the app in browser and test each flow:

#### Dashboard

- [ ] Navigate to `/dashboard`
- [ ] Verify artifact cards display artifact **names** (not "Product Specs V3" mock)
- [ ] Click on an artifact card - should navigate correctly
- [ ] Check console for any errors

#### Create New Artifact

- [ ] Click "New Artifact" button
- [ ] Upload a test file
- [ ] Enter a name and description
- [ ] Click Create
- [ ] Verify artifact is created with correct name
- [ ] Check console for any errors

#### Artifact Viewer

- [ ] Open an artifact
- [ ] Verify header shows correct artifact name
- [ ] Click Share button
- [ ] Verify Share modal shows correct artifact name
- [ ] Close modal
- [ ] Check console for any errors

#### Settings Page - Details Tab

- [ ] Navigate to artifact settings (`/a/{shareToken}/settings`)
- [ ] Verify "Details" tab is visible
- [ ] Verify loading skeleton appears briefly
- [ ] Verify name field shows actual artifact name from database
- [ ] Verify description field shows actual description (or empty)
- [ ] Verify metadata shows:
  - Created date (formatted nicely)
  - Created by (email address)
  - Last modified date (formatted nicely)
  - File size (formatted, e.g., "245 KB")
  - Version count
- [ ] Edit the name
- [ ] Verify "unsaved changes" banner appears
- [ ] Click Cancel - verify name reverts
- [ ] Edit name again
- [ ] Click Save
- [ ] Verify success toast appears
- [ ] Refresh page - verify name persisted
- [ ] Try saving with empty name - verify error toast
- [ ] Check console for any errors

---

### 6. Check for Console Errors

Throughout manual testing, keep browser DevTools console open and watch for:

- [ ] No red errors related to undefined properties
- [ ] No TypeScript-related runtime errors
- [ ] No Convex query/mutation errors
- [ ] No React warnings about keys, props, etc.

---

## Common Issues to Watch For

### Issue: "Cannot read property 'name' of undefined"

**Cause:** Component trying to access `artifact.name` before query resolves
**Fix:** Add loading state check or optional chaining

### Issue: "Expected 'name' but got 'title'"

**Cause:** Interface was updated but caller still passes `title`
**Fix:** Find the caller and update the prop name

### Issue: Tests fail with mock data mismatch

**Cause:** Mock data still uses `title`
**Fix:** Update all mock objects to use `name`

### Issue: Backend mutation fails

**Cause:** Frontend passing wrong argument names
**Fix:** Ensure mutation call uses `name` not `title`

---

## Cleanup Tasks

After validation passes:

1. [ ] Remove any TODO comments added during implementation
2. [ ] Remove any console.log debugging statements
3. [ ] Ensure consistent formatting (run prettier if available)
4. [ ] Update any related documentation if needed

---

## Acceptance Criteria

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes with all tests green
- [ ] No remaining `artifact.title` references in components
- [ ] Dashboard shows real artifact names
- [ ] Create artifact flow works end-to-end
- [ ] Artifact viewer shows correct name
- [ ] Share modal shows correct name
- [ ] Settings Details tab loads real data
- [ ] Save/Cancel on Details tab works correctly
- [ ] No console errors during manual testing

---

## Final Verification Command

Quick sanity check:

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# One-liner: Type check + test
npx tsc --noEmit && npm test

# If both pass, implementation is complete
```

---

## Reference

See full design document: `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00024-wire-frontend-artifact-settings-details/design.md`
