# Subtask 05: Update Tests

**Parent Task:** 00024-wire-frontend-artifact-settings-details
**Status:** Pending
**Estimated Time:** 30 minutes
**Dependencies:** Subtasks 01-04 must be completed first

## Objective

Update existing test files to use `name` instead of `title` in mock data, ensuring all tests pass with the renamed field.

## Files to Modify

| File | Changes |
|------|---------|
| `app/src/__tests__/dashboard/ArtifactCard.test.tsx` | Mock data: `title` -> `name` |
| `app/src/__tests__/artifact/ShareModal.test.tsx` | Mock data: `title` -> `name` |
| `app/src/hooks/__tests__/useArtifactUpload.test.tsx` | Call args: `title` -> `name` |

**Note:** `ArtifactHeader.test.tsx` was listed in the design but does not exist. Skip it.

---

## Detailed Changes

### 1. ArtifactCard.test.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/__tests__/dashboard/ArtifactCard.test.tsx`

**Lines 8-15 - Mock artifact data:**
```typescript
// BEFORE
  const mockArtifact = {
    _id: "test-id" as Id<"artifacts">,
    title: "Product Landing Pages",
    description: "AI-generated landing page reviews for Q4 2024",
    shareToken: "abc12345",
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    updatedAt: Date.now() - 2 * 60 * 60 * 1000,
  };

// AFTER
  const mockArtifact = {
    _id: "test-id" as Id<"artifacts">,
    name: "Product Landing Pages",
    description: "AI-generated landing page reviews for Q4 2024",
    shareToken: "abc12345",
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    updatedAt: Date.now() - 2 * 60 * 60 * 1000,
  };
```

**Line 23 - Test description (optional, for clarity):**
```typescript
// BEFORE
  it("should render artifact title", () => {

// AFTER
  it("should render artifact name", () => {
```

**Lines 102, 124 - Comment updates (optional):**
```typescript
// BEFORE
    // Title should still render

// AFTER
    // Name should still render
```

---

### 2. ShareModal.test.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/__tests__/artifact/ShareModal.test.tsx`

**Lines 20-24 - Mock artifact data:**
```typescript
// BEFORE
  const mockArtifact = {
    _id: "art1" as any,
    title: "Test Artifact",
    shareToken: "abc123",
  };

// AFTER
  const mockArtifact = {
    _id: "art1" as any,
    name: "Test Artifact",
    shareToken: "abc123",
  };
```

---

### 3. useArtifactUpload.test.tsx

**File:** `/Users/clintgossett/Documents/personal/personal projects/artifact-review/app/src/hooks/__tests__/useArtifactUpload.test.tsx`

This file has multiple occurrences of `title` in test calls. All need updating.

**Line 62-64 - HTML upload call:**
```typescript
// BEFORE
        uploadResult = await result.current.uploadFile({
          file,
          title: "Test Artifact",
          description: "Test description",
        });

// AFTER
        uploadResult = await result.current.uploadFile({
          file,
          name: "Test Artifact",
          description: "Test description",
        });
```

**Lines 67-72 - Assertion:**
```typescript
// BEFORE
      expect(mockMutation).toHaveBeenCalledWith({
        title: "Test Artifact",
        description: "Test description",
        fileType: "html",
        htmlContent: "<html><body>Test</body></html>",
        fileSize: file.size,
      });

// AFTER
      expect(mockMutation).toHaveBeenCalledWith({
        name: "Test Artifact",
        description: "Test description",
        fileType: "html",
        content: "<html><body>Test</body></html>",
        originalFileName: "test.html",
      });
```

**Note:** The assertion also needs to match the actual implementation. Verify the exact shape of the mutation call from the updated `useArtifactUpload.ts`.

**Lines 97-100, 128-131, 162-165, 198-201, 228-230, 266-268, 299-303, 328-331 - All uploadFile calls:**

Each `uploadFile` call uses `title:` which must be changed to `name:`. Search and replace all occurrences:

```typescript
// Find all instances of this pattern:
result.current.uploadFile({
  file,
  title: "...",

// Replace with:
result.current.uploadFile({
  file,
  name: "...",
```

**Full list of line numbers to update:**
- Line 62: `title: "Test Artifact"`
- Line 99: `title: "Test"`
- Line 131: `title: "Test"`
- Line 164: `title: "Test MD"`
- Line 200: `title: "Test ZIP"`
- Line 229: `title: "Test"`
- Line 267: `title: "Test"`
- Line 301: `title: "Test"`
- Line 331: `title: "Test"`

---

## Verification Commands

```bash
cd /Users/clintgossett/Documents/personal/personal\ projects/artifact-review/app

# Run all affected tests
npm test -- ArtifactCard.test
npm test -- ShareModal.test
npm test -- useArtifactUpload.test

# Run all tests to ensure no regressions
npm test

# Check for any remaining 'title:' in test files
grep -rn "title:" src/__tests__/ src/hooks/__tests__/ | grep -v "DialogTitle\|CardTitle\|title="
```

---

## Acceptance Criteria

- [ ] `ArtifactCard.test.tsx` mock uses `name` instead of `title`
- [ ] `ShareModal.test.tsx` mock uses `name` instead of `title`
- [ ] `useArtifactUpload.test.tsx` all `uploadFile` calls use `name`
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors in test files

---

## Notes

- Some tests may need additional updates to assertions if the mutation call shape changed
- The test for `ArtifactHeader` does not exist - skip it
- Focus on making tests pass first, then consider adding new tests for loading/error states

---

## Optional: New Tests for ArtifactDetailsTab

If time permits, add tests for the newly wired component:

```typescript
// app/src/__tests__/artifact-settings/ArtifactDetailsTab.test.tsx

describe('ArtifactDetailsTab', () => {
  it('should show loading state initially');
  it('should display artifact name from backend');
  it('should display description from backend');
  it('should display formatted metadata');
  it('should enable save button when changes made');
  it('should call updateDetails on save');
  it('should show error toast on save failure');
  it('should reset to original values on cancel');
});
```

This is optional and can be added as a follow-up task.

---

## Reference

See full design document: `/Users/clintgossett/Documents/personal/personal projects/artifact-review/tasks/00024-wire-frontend-artifact-settings-details/design.md`
