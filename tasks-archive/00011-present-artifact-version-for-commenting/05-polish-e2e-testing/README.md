# Subtask 05: Polish & E2E Testing

**Parent Task:** 00011-present-artifact-version-for-commenting
**Status:** OPEN
**Created:** 2025-12-27

---

## Overview

Final polish, accessibility improvements, and end-to-end validation of the Share Button feature. This subtask ensures production readiness through comprehensive E2E tests, accessibility audits, and visual polish.

**This subtask must run sequentially after Subtask 04 is complete.**

---

## Goals

1. Complete accessibility improvements (ARIA labels, focus management)
2. Visual polish to match Figma designs exactly
3. Handle edge cases (empty states, long content, many reviewers)
4. Write comprehensive E2E test suite
5. Generate validation video/trace for sign-off

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| **ADR 0010** | **PROPOSED** | **BLOCKING:** Must be accepted (blocks Subtasks 02 → 04) |
| Subtask 04 (Backend-Frontend Integration) | **BLOCKED** | Full feature must be working |

**Why Blocked:**
Cannot start until Subtask 04 is complete. Subtask 04 depends on Subtask 02, which is blocked by ADR 0010 decision.

**See:** `docs/architecture/decisions/0010-reviewer-invitation-account-linking.md`

**Blocks:**
- Nothing - this is the final subtask for the Share Button feature

---

## Tasks

### 5.1 Accessibility Improvements

- [ ] Add ARIA labels to icon-only buttons (close, copy, remove)
- [ ] Add ARIA live region for "Copied" feedback
- [ ] Ensure focus trap in modal
- [ ] Test keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- [ ] Verify screen reader announces modal title when opened
- [ ] Test with VoiceOver/NVDA

### 5.2 Visual Polish

- [ ] Match all colors to design spec (Figma DESIGN_SYSTEM.md)
- [ ] Verify gradient styling on share link section
- [ ] Test responsive behavior (mobile breakpoints)
- [ ] Verify loading skeletons match layout
- [ ] Check hover/focus states on all interactive elements
- [ ] Ensure consistent spacing and typography

### 5.3 Edge Cases

- [ ] Test with 0 reviewers (empty state)
- [ ] Test with many reviewers (10+, verify scroll)
- [ ] Test long email addresses (truncation)
- [ ] Test long artifact titles (truncation)
- [ ] Test rapid consecutive actions (button mashing)
- [ ] Test network failure during mutation
- [ ] Test session timeout during modal open

### 5.4 E2E Tests

**Location:** `tasks/00011-present-artifact-version-for-commenting/05-polish-e2e-testing/tests/e2e/`

**Test File:** `share-artifact.spec.ts`

**Test Cases:**

```typescript
// share-artifact.spec.ts
describe("Share Artifact E2E", () => {
  describe("Owner Flow", () => {
    it("should open share modal from artifact viewer");
    it("should invite reviewer via email");
    it("should see invited reviewer in list");
    it("should copy share link to clipboard");
    it("should change link permission to view-only");
    it("should change link permission to can-comment");
    it("should change reviewer permission");
    it("should remove reviewer with confirmation");
    it("should close modal with X button");
    it("should close modal with Close button");
    it("should close modal with Escape key");
  });

  describe("Non-Owner Flow", () => {
    it("should not show Share button for non-owner");
    it("should not be able to access share modal via URL manipulation");
  });

  describe("Error Handling", () => {
    it("should show error for invalid email format");
    it("should show error for duplicate invitation");
    it("should show error when network fails");
  });

  describe("Accessibility", () => {
    it("should be navigable with keyboard only");
    it("should trap focus within modal");
    it("should return focus to trigger button on close");
    it("should announce modal content to screen readers");
  });

  describe("Edge Cases", () => {
    it("should handle empty reviewers list");
    it("should scroll when many reviewers");
    it("should truncate long emails");
  });
});
```

### 5.5 Validation Video

- [ ] Record Playwright trace of happy path flow:
  1. Open artifact as owner
  2. Click Share button
  3. Invite a reviewer
  4. Change reviewer permission
  5. Copy share link
  6. Change share link permission
  7. Remove reviewer
  8. Close modal
- [ ] Save to `tests/validation-videos/share-artifact-trace.zip`

---

## Acceptance Criteria

- [ ] All E2E tests pass
- [ ] Accessibility audit passes (no critical issues)
- [ ] Visual design matches Figma exactly
- [ ] Validation trace generated and saved
- [ ] All edge cases handled gracefully
- [ ] Feature is production-ready

---

## Deliverables

| File | Description |
|------|-------------|
| `tests/e2e/share-artifact.spec.ts` | Comprehensive E2E test suite |
| `tests/validation-videos/share-artifact-trace.zip` | Playwright trace of happy path |
| `test-report.md` | Final test coverage report |
| `ACCESSIBILITY-AUDIT.md` | Accessibility audit results |

---

## Test Infrastructure Setup

```bash
# From task tests/ directory
cd tasks/00011-present-artifact-version-for-commenting/05-polish-e2e-testing/tests
npm init -y
npm install -D @playwright/test
npx playwright install chromium
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

---

## Accessibility Checklist

### Keyboard Navigation
- [ ] All interactive elements reachable via Tab
- [ ] Tab order is logical
- [ ] Enter/Space activates buttons
- [ ] Escape closes modal
- [ ] Arrow keys navigate dropdowns

### ARIA
- [ ] Modal has `role="dialog"` and `aria-modal="true"`
- [ ] Modal has `aria-labelledby` pointing to title
- [ ] Close buttons have `aria-label`
- [ ] Copy button has `aria-label`
- [ ] "Copied" feedback uses `aria-live="polite"`
- [ ] Dropdown menus have proper ARIA attributes

### Focus Management
- [ ] Focus moves to modal when opened
- [ ] Focus trapped within modal
- [ ] Focus returns to trigger button on close
- [ ] Focus ring visible on all interactive elements

---

## Visual Polish Checklist

### Colors (from Figma DESIGN_SYSTEM.md)
- [ ] Permission badge: `bg-purple-100 text-purple-800`
- [ ] Share link gradient: `bg-gradient-to-r from-blue-500 to-purple-500`
- [ ] Info box: `bg-blue-50 border-blue-200`
- [ ] Primary button: `bg-blue-600 hover:bg-blue-700`
- [ ] Destructive: `bg-red-100 text-red-800` (for remove)

### Typography
- [ ] Modal title: `text-lg font-semibold`
- [ ] Section headers: `text-sm font-medium text-gray-700`
- [ ] Body text: `text-sm text-gray-600`
- [ ] Email addresses: `text-sm font-mono`

### Spacing
- [ ] Modal padding: `p-6`
- [ ] Section spacing: `space-y-6`
- [ ] Card padding: `p-4`
- [ ] Button padding: `px-4 py-2`

---

## E2E Test Helper Functions

```typescript
// helpers.ts
import { Page, expect } from '@playwright/test';

export async function openShareModal(page: Page) {
  await page.click('button:has-text("Share")');
  await expect(page.getByRole('dialog')).toBeVisible();
}

export async function inviteReviewer(page: Page, email: string, permission: 'view-only' | 'can-comment') {
  await page.fill('input[type="email"]', email);
  await page.click(`[data-testid="permission-select"]`);
  await page.click(`[data-value="${permission}"]`);
  await page.click('button:has-text("Invite")');
}

export async function copyShareLink(page: Page) {
  await page.click('button:has-text("Copy")');
  await expect(page.getByText('Copied')).toBeVisible();
}

export async function closeShareModal(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
```

---

## References

- **Implementation Plan:** `01-share-button-planning/IMPLEMENTATION-PLAN.md`
- **Architecture:** `01-share-button-planning/ARCHITECTURE.md`
- **Subtask 04:** `04-backend-frontend-integration/README.md`
- **Figma Designs:** `figma-designs/SHARE_ARTIFACT.md`
- **Design System:** `figma-designs/DESIGN_SYSTEM.md`
- **TDD Workflow:** `docs/development/workflow.md`
