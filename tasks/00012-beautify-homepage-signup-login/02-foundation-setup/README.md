# Subtask 02: Foundation Setup

**Parent Task:** 00012-beautify-homepage-signup-login
**Status:** ✅ COMPLETE
**Created:** 2025-12-26
**Completed:** 2025-12-26

---

## Objective

Establish the design system foundation by updating global styles with brand colors and Inter font, installing required ShadCN components, and creating shared reusable components.

---

## Dependencies

- **Subtask 01 (Implementation Plan):** Must be complete (provides specifications)

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/app/globals.css` | Updated with Inter font import and brand color CSS variables |
| `app/src/components/ui/accordion.tsx` | ShadCN Accordion component (for FAQ) |
| `app/src/components/ui/alert.tsx` | ShadCN Alert component (for error/info boxes) |
| `app/src/components/ui/avatar.tsx` | ShadCN Avatar component (for social proof) |
| `app/src/components/ui/badge.tsx` | ShadCN Badge component (for labels/pills) |
| `app/src/components/ui/separator.tsx` | ShadCN Separator component (for dividers) |
| `app/src/components/shared/Logo.tsx` | Small logo for header navigation |
| `app/src/components/shared/GradientLogo.tsx` | Large (~80px) circular gradient logo for auth pages |
| `app/src/components/shared/IconInput.tsx` | Input field with icon inside on left side |

---

## Requirements

### 1. Update `globals.css`

Add Inter font import from Google Fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

Update CSS variables with brand colors:
```css
:root {
  /* Brand colors from DESIGN_SYSTEM.md */
  --primary: #2563EB;        /* Blue - Tailwind blue-600 */
  --secondary: #7C3AED;      /* Purple - Tailwind purple-600 */

  /* Additional colors from Figma screenshots */
  --input-bg: #F9FAFB;       /* Light gray for inputs - gray-50 */
  --demo-panel-bg: #FEF9C3;  /* Cream/beige for demo panel - yellow-100 */
}
```

Set Inter as the default font family:
```css
body {
  font-family: 'Inter', sans-serif;
}
```

### 2. Install ShadCN Components

Run the following commands from `app/` directory:
```bash
cd app
npx shadcn@latest add accordion
npx shadcn@latest add alert
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add separator
```

### 3. Create `Logo.tsx`

Small logo component for header navigation:
- MessageSquare icon from Lucide
- Blue-to-purple gradient background
- Approximately 32-40px size
- "Artifact Review" text next to icon

### 4. Create `GradientLogo.tsx`

Large circular gradient logo for auth pages:
- Accepts an icon prop (LogIn for login, UserPlus for signup)
- Circular container approximately 80px
- Blue-to-purple gradient background (`from-blue-600 to-purple-600`)
- White icon centered inside
- Used on login and signup pages

### 5. Create `IconInput.tsx`

Input field with icon inside on left:
- Wraps ShadCN Input component
- Accepts icon prop (Lucide icon component)
- Icon rendered inside input on left side
- Input padding adjusted to accommodate icon
- Light gray background (`bg-gray-50`)
- Props: `icon`, `label`, plus all standard Input props

---

## Reference Files

### Figma Design System
- `/figma-designs/DESIGN_SYSTEM.md` - Design tokens and patterns
- `/figma-designs/src/styles/theme.css` - CSS variables
- `/figma-designs/src/styles/fonts.css` - Font imports

### Figma Screenshots (Visual Reference)
- `/temp figma screenshots/log-in-page.png` - Shows GradientLogo and IconInput styling

### Current Implementation
- `/app/src/app/globals.css` - Current global styles to update
- `/app/src/components/ui/input.tsx` - Base Input component for IconInput

---

## Acceptance Criteria

- [x] Inter font loads correctly on all pages
- [x] Brand colors (blue #2563EB, purple #7C3AED) available as CSS variables
- [x] All 5 ShadCN components install without errors
- [x] Logo.tsx renders gradient icon with MessageSquare
- [x] GradientLogo.tsx renders large circular gradient with icon prop
- [x] IconInput.tsx renders input with icon inside, light gray background
- [x] No visual regressions on existing pages
- [x] All components exported properly for import

## Implementation Complete

All deliverables have been implemented and tested:

✅ **globals.css** - Updated with Inter font and brand colors (Primary: #2563EB, Secondary: #7C3AED)
✅ **ShadCN Components** - Installed accordion, badge, avatar, alert, separator
✅ **Logo.tsx** - 40x40px gradient logo with MessageSquare icon
✅ **GradientLogo.tsx** - 80x80px circular gradient with configurable icon prop
✅ **IconInput.tsx** - Input with left-aligned icon, gray background

### Test Results

**Total Tests:** 19
**Passing:** 19
**Failing:** 0
**Coverage:** 100%

See [test-report.md](./test-report.md) for detailed test coverage.

---

## Estimated Effort

2-3 hours

---

## How This Will Be Used

This subtask establishes the foundational elements that all subsequent subtasks depend on:
- **Subtask 03-06 (Landing Page):** Uses Logo.tsx in header
- **Subtask 07 (Login):** Uses GradientLogo.tsx and IconInput.tsx
- **Subtask 08 (Signup):** Reuses GradientLogo.tsx and IconInput.tsx
- **All subtasks:** Use brand colors and Inter font
