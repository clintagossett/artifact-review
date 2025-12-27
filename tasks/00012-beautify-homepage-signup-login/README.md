# Task 00012: Beautify Homepage, Signup, and Login Pages

**GitHub Issue:** #12

---

## Resume (Start Here)

**Last Updated:** 2025-12-26 (Session 2)

### Current Status: READY FOR IMPLEMENTATION

**Phase:** Architecture complete. Implementation plan created in subtask 01.

### What We Did This Session (Session 2)

1. **Reviewed Figma designs** - Analyzed LandingPage, LoginPage, SignupPage, and design system
2. **Audited current pages** - Documented current state vs target state
3. **Created implementation plan** - Full gap analysis and subtask breakdown in `01-architect-implementation-plan/`

### Next Steps

1. **Subtask 02: Foundation Setup** - Update globals.css, add ShadCN components, create Logo component
2. **Subtask 03: Landing Page Header & Hero** - First two sections of landing page
3. Continue through subtasks 04-09 (see implementation plan)

---

## Objective

Improve the visual design and polish of the core user-facing pages to create a cohesive, professional experience that makes a strong first impression.

## Pages in Scope

- **Homepage** - Landing page / marketing page (currently minimal, needs full marketing page)
- **Sign up page** - New user registration (needs name field, password UX, polish)
- **Login page** - Existing user authentication (needs icons, toggle, polish)

## Goals

- Create a cohesive, professional visual design
- Align with Figma reference designs where applicable
- Improve user experience and first impressions
- Ensure responsive design across devices

---

## Current State

### Homepage (`app/src/app/page.tsx`)
- Single centered Card with title and basic CTAs
- No marketing content, no value proposition
- Missing all 9 sections from Figma design (Hero, Features, Pricing, FAQ, etc.)

### Login Page (`app/src/app/login/page.tsx` + `LoginForm.tsx`)
- Basic functional form
- Missing: gradient logo, input icons, tab toggle, forgot password, demo credentials panel
- Background gradient uses neutral colors instead of blue/purple

### Signup Page (`app/src/app/register/page.tsx` + `RegisterForm.tsx`)
- Basic functional form
- Missing: name field, password strength UI, auth method toggle, demo notice
- No visual password requirement checklist

### Design Tokens
- Using default ShadCN neutral theme
- Missing: Inter font, blue/purple brand colors

---

## Subtasks

| ID | Name | Status |
|----|------|--------|
| 01 | [Implementation Plan](./01-architect-implementation-plan/README.md) | Complete |
| 02 | Foundation Setup | Pending |
| 03 | Landing Page - Header & Hero | Pending |
| 04 | Landing Page - Content Sections | Pending |
| 05 | Landing Page - Social Proof & Pricing | Pending |
| 06 | Landing Page - FAQ, CTA & Footer | Pending |
| 07 | Login Page Beautification | Pending |
| 08 | Signup Page Beautification | Pending |
| 09 | Testing & Polish | Pending |

---

## Changes Made

_(To be documented during implementation)_

## Testing

- Visual review across breakpoints (mobile, tablet, desktop)
- Cross-browser testing (Chrome, Safari, Firefox)
- Accessibility audit (contrast, keyboard navigation)

---

## Key References

### Figma Designs (Source of Truth)
- `figma-designs/DESIGN_SYSTEM.md` - Design tokens and patterns
- `figma-designs/src/app/components/LandingPage.tsx` - Landing page (678 lines)
- `figma-designs/src/app/components/LoginPage.tsx` - Login page (255 lines)
- `figma-designs/src/app/components/SignupPage.tsx` - Signup page (341 lines)

### Current Implementation
- `app/src/app/page.tsx` - Current homepage (125 lines)
- `app/src/app/login/page.tsx` - Current login page (61 lines)
- `app/src/app/register/page.tsx` - Current register page (24 lines)
- `app/src/components/auth/LoginForm.tsx` - Current login form (86 lines)
- `app/src/components/auth/RegisterForm.tsx` - Current register form (110 lines)
