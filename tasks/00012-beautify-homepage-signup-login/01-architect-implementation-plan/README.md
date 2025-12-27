# Task 00012 Subtask 01: Implementation Plan for Beautifying Homepage, Signup, and Login

**Created:** 2025-12-26
**Updated:** 2025-12-26 (Added Figma screenshot insights)
**Status:** Complete

---

## Executive Summary

This document provides a comprehensive implementation plan for beautifying the homepage, signup, and login pages based on the Figma designs in `figma-designs/`. The current implementation is functional but minimal - the Figma designs provide a fully polished, marketing-ready experience with rich visual elements, comprehensive content, and thoughtful UX patterns.

**Update:** Figma screenshots have been reviewed and confirm the design direction. Key additions include discovery of the authenticated dashboard view and artifact upload modal, which are out of scope for this task but noted for future reference.

---

## 1. Figma Design Findings

### 1.1 Design System Overview

The Figma designs establish a clear design system documented in `figma-designs/DESIGN_SYSTEM.md`:

| Element | Specification |
|---------|---------------|
| **Primary Color** | Blue `#2563EB` (Tailwind: `bg-blue-600`) |
| **Secondary Color** | Purple `#7C3AED` (Tailwind: `bg-purple-600`) |
| **Primary Gradient** | `bg-gradient-to-br from-blue-600 to-purple-600` |
| **Font Family** | Inter (Google Fonts) |
| **Base Font Size** | 16px |
| **Spacing Grid** | 8px base (Tailwind: `p-2`, `p-4`, `p-6`, `p-8`) |
| **Border Radius** | `rounded-xl` (cards), `rounded-2xl` (featured), `rounded-lg` (buttons) |
| **Shadow** | `shadow-sm` (cards), `shadow-lg`/`shadow-2xl` (featured) |

**Additional colors confirmed from screenshots:**

| Element | Color | Tailwind Approx |
|---------|-------|-----------------|
| Input background | `#F9FAFB` | `bg-gray-50` |
| Demo panel background | `#FEF9C3` | `bg-yellow-100` |
| Purple link text | `#7C3AED` | `text-purple-600` |
| Version badge background | Purple pill | `bg-purple-100 text-purple-700` |
| Final CTA gradient | Dark blue to purple | `bg-gradient-to-r from-blue-900 to-purple-900` |

### 1.2 Landing Page Design (`LandingPage.tsx`)

The Figma landing page is a comprehensive marketing page with **9 sections**:

1. **Header/Navigation** - Sticky header with logo, nav links, Sign In/Start Free buttons
2. **Hero Section** - Two-column layout with headline, subtext, CTAs, social proof avatars
3. **Problem Statement** - Centered text explaining the pain point
4. **How It Works** - 3-step cards (Upload, Share, Get Feedback)
5. **Key Features** - Two alternating feature sections with visuals
6. **Social Proof** - Testimonials (3 cards) + stats (3 metrics)
7. **Pricing** - 3-tier pricing cards (Free, Pro, Team)
8. **FAQ** - Expandable FAQ accordion
9. **Final CTA** - Gradient banner with CTAs
10. **Footer** - 4-column footer with links

**Key Visual Elements:**
- Blue-to-purple gradient logo icon with MessageSquare
- Gradient badges and pills for feature highlights
- Mock browser window showing the product
- Avatar stacks for social proof
- Star ratings on testimonials
- Check icons for feature lists

### 1.3 Login Page Design (`LoginPage.tsx`)

The Figma login page includes:

- Centered card layout with max-width of 400px (approx)
- Gradient background (`from-blue-50 via-white to-purple-50`)
- Logo icon with gradient (LogIn icon inside)
- Toggle between Password and Magic Link modes
- Input fields with left-aligned icons (Mail, Lock)
- "Forgot password?" link
- Magic link info panel (purple theme)
- Demo credentials panel (blue theme)
- Sign up link at bottom
- Terms footer

**Key UX Patterns:**
- Tab toggle for authentication method selection
- Password/Magic Link mode switching
- Loading states with spinner
- Error alerts with AlertCircle icon
- Contextual info boxes

### 1.4 Signup Page Design (`SignupPage.tsx`)

The Figma signup page includes:

- Same centered layout as login
- Same gradient background
- UserPlus icon in gradient logo
- Full name field (in addition to email)
- Password requirements checklist with real-time validation
- Confirm password field with match validation
- Toggle between Password and Magic Link
- Demo mode notice
- Login link at bottom

**Key UX Patterns:**
- Password strength indicators (met/unmet)
- Real-time password match feedback
- Magic link option for passwordless signup

### 1.5 Additional Pages Found

- `MagicLinkSentPage.tsx` - Confirmation page after magic link is sent
- `ForgotPasswordPage.tsx` - Password reset request
- `ResetPasswordPage.tsx` - New password entry

### 1.6 Visual Details from Figma Screenshots (New)

The following details were confirmed/discovered from direct Figma screenshots:

#### Landing Page (home-page.png)
- **Header**: Minimal header with gradient logo on left, centered "Collaborative HTML Review Platform" dropdown, help (?) icon and "Share" button on right
- **Hero gradient badge**: Purple/blue gradient pill above headline reading "AI-Powered Review Platform"
- **Hero headline**: "From AI output to stakeholder feedback in one click" - large, bold, left-aligned
- **Hero mockup**: Browser window showing actual product interface (reviewing HTML with comments)
- **Avatar stack**: Shows 5 overlapping avatars with "+1000 teams" text
- **Stats section**: "500+" | "10,000+" | "2.5 hrs" metrics in large text
- **Pricing tiers**: $0 (Free), $12 (Pro), $18 (Team) per month
- **Final CTA**: Dark blue-to-purple gradient banner at bottom

#### Login Page (log-in-page.png)
- **Logo icon**: Large circular gradient (blue-to-purple) background with white login arrow icon inside - much larger than typical logos (~80px)
- **Heading**: "Welcome back" in large bold text
- **Subheading**: "Sign in to your Artifact Review account"
- **Tab toggle**: Pill-style toggle with "Password" (lock icon) and "Magic Link" (sparkle icon) - NOT traditional tabs
- **Input styling**: Light gray background (#F9FAFB approx), icons inside on left (Mail, Lock icons)
- **Forgot password**: Purple text link positioned to right of "Password" label
- **Sign in button**: Full-width, blue gradient, with arrow icon
- **Demo panel**: Beige/cream background (#FEF9C3 approx) with wand emoji, showing test credentials
- **Terms footer**: Small gray text at very bottom

#### Dashboard Page (landing_page_logged_in.png) - OUT OF SCOPE
This reveals the authenticated experience (noted for future tasks):
- App header with "Artifact Review" branding, search bar, "Invite Team" and purple "Upload" button
- Large drop zone area for file uploads
- "Your Artifacts" section with artifact cards showing:
  - Project name and description
  - Version badges (v1, v2, v3) in purple pills
  - File/branch counts with icons
  - Collaborator avatars
  - Timestamps ("2 hours ago")
- "Recent Activity" feed with user actions

#### Artifact Upload Modal (artifact_upload-modal.png) - OUT OF SCOPE
- Modal dialog for creating new artifacts
- Drop zone with dashed border and upload icon
- "Project Name" required field
- "Description (optional)" field
- "Cancel" and "Create Project" buttons

---

## 2. Current Implementation State

### 2.1 Homepage (`app/src/app/page.tsx`)

**Current State: Minimal/Functional**

| Aspect | Current | Issues |
|--------|---------|--------|
| Layout | Single centered Card | Not a marketing page |
| Content | Title + description only | No value proposition |
| Sections | None | Missing all 9 Figma sections |
| Visual Elements | Basic Card component | No gradient, no icons, no imagery |
| CTAs | "Start Using", "Sign In", "Create Account" | Generic styling |
| Authenticated View | User info display | Placeholder, not dashboard redirect |

**Lines of Code:** ~125 lines
**Components Used:** Card, Button, Dialog, Input, Label

### 2.2 Login Page (`app/src/app/login/page.tsx` + `LoginForm.tsx`)

**Current State: Basic Functional**

| Aspect | Current | Figma Target | Gap |
|--------|---------|--------------|-----|
| Layout | Centered Card, 400px | Same | Matches |
| Background | `bg-gradient-to-b from-background to-muted` | `from-blue-50 via-white to-purple-50` | Different colors |
| Logo | None | Gradient icon with LogIn | Missing |
| Icons in Inputs | None | Mail, Lock icons | Missing |
| Auth Toggle | Button link between modes | Tab-style toggle | Different pattern |
| Forgot Password | None | Link present | Missing |
| Error Display | Plain text | Alert with icon | Less polished |
| Demo Credentials | None | Info panel | Missing |
| Magic Link Info | None | Purple info box | Missing |

**Lines of Code:** LoginForm ~86 lines, MagicLinkForm exists
**Components Used:** Card, Input, Label, Button

### 2.3 Register Page (`app/src/app/register/page.tsx` + `RegisterForm.tsx`)

**Current State: Basic Functional**

| Aspect | Current | Figma Target | Gap |
|--------|---------|--------------|-----|
| Layout | Centered Card, 400px | Same | Matches |
| Name Field | Missing | Full name field | Missing |
| Password Requirements | Validation exists | Visual checklist | Different UX |
| Confirm Password | Exists | With match indicator | Needs visual feedback |
| Auth Toggle | None | Password/Magic Link tabs | Missing |
| Demo Notice | None | Info panel | Missing |

**Lines of Code:** ~110 lines
**Components Used:** Card, Input, Label, Button

### 2.4 Global Styles (`app/src/app/globals.css`)

**Current State:** Standard ShadCN setup with neutral color scheme

| Token | Current | Figma | Notes |
|-------|---------|-------|-------|
| Primary | `0 0% 9%` (neutral dark) | Blue `#2563EB` | Need brand color |
| Background | White/neutral | White | OK |
| Font | System default | Inter | Need font import |

---

## 3. Gap Analysis Summary

### 3.1 Critical Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| **Homepage is not a landing page** | No marketing presence | P0 |
| **No brand colors** | Generic look | P1 |
| **No Inter font** | Typography inconsistent | P1 |
| **Missing icons in forms** | Less polished | P2 |
| **No gradient logo** | Missing brand identity | P1 |

### 3.2 Feature Gaps

| Feature | Current | Target |
|---------|---------|--------|
| Hero section | None | Full hero with product visual |
| Feature sections | None | 2 alternating feature blocks |
| Pricing table | None | 3-tier comparison |
| Testimonials | None | 3 testimonial cards |
| FAQ accordion | None | 5 expandable items |
| Footer | None | 4-column footer |
| Password/Magic Link toggle | Link-based | Tab toggle |
| Password strength UI | None | Visual checklist |
| Name field in signup | None | Required |

### 3.3 ShadCN Components Needed

Current components in `app/src/components/ui/`:
- `button.tsx`
- `card.tsx`
- `input.tsx`
- `label.tsx`
- `form.tsx`

**Components to Add:**
- `dialog.tsx` (exists but may need update)
- `accordion.tsx` (for FAQ)
- `badge.tsx` (for labels/pills)
- `avatar.tsx` (for social proof)
- `tabs.tsx` (for auth method toggle - **Note:** screenshots show pill-style toggle, may need custom styling or custom component)
- `alert.tsx` (for error/info boxes)
- `separator.tsx` (for dividers)

**Custom Components Needed (from screenshot analysis):**
- `AuthMethodToggle.tsx` - Pill-style toggle for Password/Magic Link (not standard tabs)
- `IconInput.tsx` - Input field with icon inside on left side
- `GradientLogo.tsx` - Large circular gradient background with icon inside (~80px for auth pages)

---

## 4. Recommended Approach

### 4.1 Phase 0: Foundation (Pre-requisite)

**Objective:** Establish design tokens and shared components

1. **Update `globals.css`**
   - Add Inter font import
   - Update CSS variables for brand colors (blue/purple)
   - Add gradient utilities if needed

2. **Add ShadCN Components**
   ```bash
   npx shadcn@latest add accordion badge avatar tabs alert separator
   ```

3. **Create Shared Components**
   - `Logo.tsx` - Gradient logo with MessageSquare icon
   - `GradientButton.tsx` - Blue CTA button (or use Button with custom classes)

### 4.2 Phase 1: Landing Page (Homepage)

**Objective:** Transform homepage into marketing landing page

**Approach:** Create new components, largely following Figma `LandingPage.tsx`

| Component | File | Source Reference |
|-----------|------|------------------|
| Header | `LandingHeader.tsx` | Lines 8-27 of Figma |
| Hero | `HeroSection.tsx` | Lines 29-118 of Figma |
| Problem | `ProblemSection.tsx` | Lines 120-131 |
| HowItWorks | `HowItWorksSection.tsx` | Lines 133-202 |
| Features | `FeaturesSection.tsx` | Lines 204-321 |
| SocialProof | `SocialProofSection.tsx` | Lines 323-413 |
| Pricing | `PricingSection.tsx` | Lines 415-552 |
| FAQ | `FAQSection.tsx` | Lines 554-594 |
| FinalCTA | `FinalCTASection.tsx` | Lines 596-617 |
| Footer | `LandingFooter.tsx` | Lines 619-675 |

**Key Decisions:**
- Use Next.js App Router for navigation (Links to /login, /register)
- Authenticated users should redirect to `/dashboard`
- Keep `page.tsx` as the orchestrator, import section components

### 4.3 Phase 2: Login Page

**Objective:** Polish login page to match Figma design

**Changes (refined from screenshot review):**
1. Update `LoginForm.tsx`:
   - Add large (~80px) circular gradient logo with LogIn arrow icon (white on blue-purple gradient)
   - "Welcome back" heading + "Sign in to your Artifact Review account" subheading
   - **Pill-style toggle** (not traditional tabs) for Password/Magic Link with icons
   - Input fields with light gray background (#F9FAFB) and left-aligned icons (Mail, Lock)
   - "Forgot password?" link in purple, positioned RIGHT of "Password" label
   - Blue gradient "Sign in" button with arrow icon, full width
   - Demo credentials panel with cream/beige background (#FEF9C3), wand emoji
   - Error alert component with icon
   - Terms footer at bottom in small gray text
   - Update background gradient colors

2. Update `MagicLinkForm.tsx`:
   - Add magic link info box (purple theme)
   - Sparkle icon for Magic Link mode
   - Consistent styling with LoginForm

3. Create `MagicLinkSentPage.tsx`:
   - Confirmation page after magic link sent
   - Instructions and resend functionality

### 4.4 Phase 3: Signup Page

**Objective:** Polish signup page to match Figma design

**Changes:**
1. Update `RegisterForm.tsx`:
   - Add gradient logo with UserPlus icon
   - Add name field
   - Add icons to input fields
   - Add password requirements checklist
   - Add password match indicator
   - Add auth method toggle (Password/Magic Link)
   - Add demo mode notice
   - Update background gradient

---

## 5. Subtask Breakdown

### Subtask 02: Foundation Setup

**Deliverables:**
- Updated `globals.css` with Inter font and brand colors
- New ShadCN components installed (accordion, badge, avatar, alert, separator)
- Shared components created:
  - `Logo.tsx` - Small logo for header
  - `GradientLogo.tsx` - Large (~80px) circular gradient logo for auth pages
  - `IconInput.tsx` - Input field with icon inside on left

**Estimated Effort:** 2-3 hours

### Subtask 03: Landing Page - Header & Hero

**Deliverables:**
- `LandingHeader.tsx`
- `HeroSection.tsx`
- Updated `page.tsx` to use new components

**Estimated Effort:** 2-3 hours

### Subtask 04: Landing Page - Content Sections

**Deliverables:**
- `ProblemSection.tsx`
- `HowItWorksSection.tsx`
- `FeaturesSection.tsx`

**Estimated Effort:** 2-3 hours

### Subtask 05: Landing Page - Social Proof & Pricing

**Deliverables:**
- `SocialProofSection.tsx`
- `PricingSection.tsx`

**Estimated Effort:** 2-3 hours

### Subtask 06: Landing Page - FAQ, CTA & Footer

**Deliverables:**
- `FAQSection.tsx`
- `FinalCTASection.tsx`
- `LandingFooter.tsx`

**Estimated Effort:** 1-2 hours

### Subtask 07: Login Page Beautification

**Deliverables:**
- Updated `LoginForm.tsx` with:
  - GradientLogo component (LogIn icon)
  - "Welcome back" heading/subheading
  - Pill-style auth method toggle (Password/Magic Link)
  - IconInput fields (Mail, Lock)
  - "Forgot password?" link
  - Blue gradient submit button with arrow
  - Demo credentials panel (cream background)
  - Terms footer
- `AuthMethodToggle.tsx` - Custom pill-style toggle component
- `DemoCredentialsPanel.tsx` - Reusable demo info box
- Updated `login/page.tsx` with gradient background
- `MagicLinkSentPage.tsx` (if not exists)

**Estimated Effort:** 3-4 hours

### Subtask 08: Signup Page Beautification

**Deliverables:**
- Updated `RegisterForm.tsx` with:
  - GradientLogo component (UserPlus icon)
  - Heading/subheading
  - Reuse AuthMethodToggle from login
  - Name field (new)
  - IconInput fields (User, Mail, Lock)
  - Password requirements checklist
  - Reuse DemoCredentialsPanel (demo mode notice)
  - Terms footer
- Updated `register/page.tsx` with gradient background

**Estimated Effort:** 2-3 hours (faster due to reuse from login)

### Subtask 09: Testing & Polish

**Deliverables:**
- Responsive testing (mobile, tablet, desktop)
- Cross-browser testing
- Accessibility review
- Final polish and fixes

**Estimated Effort:** 1-2 hours

---

## 6. Technical Considerations

### 6.1 Responsive Design

The Figma designs use these breakpoints:
- **Mobile:** 375px
- **Tablet:** 768px (md:)
- **Desktop:** 1280px (lg:) with max-width container

Tailwind classes to use:
```jsx
// Container pattern
<div className="max-w-[1280px] mx-auto px-10">

// Grid pattern
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

// Show/hide
<nav className="hidden md:flex items-center gap-8">
```

### 6.2 Accessibility

Requirements:
- All interactive elements keyboard accessible
- Color contrast meets WCAG AA (4.5:1 for text)
- Form labels properly associated
- Focus states visible
- Alt text for any images

### 6.3 Authentication Integration

The current implementation uses Convex Auth with:
- `useAuthActions()` hook for signIn/signOut
- `Authenticated` / `Unauthenticated` components for conditional rendering
- Password and Magic Link flows

These patterns should be preserved in the beautified version.

### 6.4 Next.js App Router Considerations

- Use `"use client"` directive for interactive components
- Use `Link` from `next/link` for navigation
- Use `useRouter` for programmatic navigation
- Server components where possible for static content

---

## 7. File Structure

```
app/src/
├── app/
│   ├── page.tsx                    # Landing page orchestrator
│   ├── login/
│   │   └── page.tsx                # Login page
│   ├── register/
│   │   └── page.tsx                # Signup page
│   └── globals.css                 # Updated with brand tokens
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx           # Updated
│   │   ├── RegisterForm.tsx        # Updated
│   │   ├── MagicLinkForm.tsx       # Existing
│   │   ├── MagicLinkSentPage.tsx   # New
│   │   ├── AuthMethodToggle.tsx    # New - pill-style Password/Magic Link toggle
│   │   └── DemoCredentialsPanel.tsx # New - cream-colored demo info box
│   ├── landing/                    # New folder
│   │   ├── LandingHeader.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ProblemSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── SocialProofSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── FAQSection.tsx
│   │   ├── FinalCTASection.tsx
│   │   └── LandingFooter.tsx
│   ├── shared/                     # New folder
│   │   ├── Logo.tsx                # Small logo for header
│   │   ├── GradientLogo.tsx        # Large gradient circle logo for auth pages
│   │   └── IconInput.tsx           # Input with icon inside
│   └── ui/
│       ├── accordion.tsx           # Add
│       ├── alert.tsx               # Add
│       ├── avatar.tsx              # Add
│       ├── badge.tsx               # Add
│       ├── separator.tsx           # Add
│       ├── tabs.tsx                # Add (may not use if custom toggle)
│       └── ... (existing)
```

---

## 8. Success Criteria

- [ ] Landing page has all 9 sections from Figma design
- [ ] Login page matches Figma design with toggle, icons, and panels
- [ ] Signup page matches Figma design with name field and password UX
- [ ] Brand colors (blue/purple gradient) applied throughout
- [ ] Inter font loaded and applied
- [ ] Responsive at mobile (375px), tablet (768px), desktop (1280px)
- [ ] All existing authentication flows still work
- [ ] No accessibility regressions

---

## 9. Reference Files

### Figma Screenshots (Visual Reference)
- `/temp figma screenshots/home-page.png` - Landing page (logged out)
- `/temp figma screenshots/log-in-page.png` - Login page with Password mode
- `/temp figma screenshots/landing_page_logged_in.png` - Dashboard (authenticated) - OUT OF SCOPE
- `/temp figma screenshots/artifact_upload-modal.png` - Upload modal - OUT OF SCOPE

### Figma Code Exports (Source of Truth)
- `/figma-designs/DESIGN_SYSTEM.md` - Design tokens and patterns
- `/figma-designs/src/app/components/LandingPage.tsx` - Landing page
- `/figma-designs/src/app/components/LoginPage.tsx` - Login page
- `/figma-designs/src/app/components/SignupPage.tsx` - Signup page
- `/figma-designs/src/app/components/MagicLinkSentPage.tsx` - Magic link confirmation
- `/figma-designs/src/styles/theme.css` - CSS variables
- `/figma-designs/src/styles/fonts.css` - Font imports

### Current Implementation
- `/app/src/app/page.tsx` - Current homepage
- `/app/src/app/login/page.tsx` - Current login page
- `/app/src/app/register/page.tsx` - Current register page
- `/app/src/components/auth/LoginForm.tsx` - Current login form
- `/app/src/components/auth/RegisterForm.tsx` - Current register form
- `/app/src/app/globals.css` - Current global styles

---

## 10. Notes for Implementation

1. **Do not override typography with Tailwind** - The Figma design system uses theme.css for typography. In our implementation, we can either:
   - Port the theme.css typography rules
   - Or use Tailwind typography classes consistently (simpler for Next.js)

2. **Verify Lucide icons exist** before importing - Use the icons from the Figma components as reference.

3. **Preserve existing functionality** - The beautification should not break:
   - Anonymous sign-in
   - Password authentication
   - Magic link authentication
   - Session persistence

4. **Use composition over duplication** - Extract reusable patterns into shared components.

---

## 11. Out-of-Scope Discoveries (Future Tasks)

The Figma screenshots revealed additional pages/components that are **not part of this task** but should be documented for future work:

### 11.1 Authenticated Dashboard (`landing_page_logged_in.png`)

When a user is authenticated, they should see a dashboard instead of the landing page. Key elements:

| Element | Description |
|---------|-------------|
| **App Header** | "Artifact Review" branding with gradient icon, search bar, "Invite Team" button, purple "Upload" button, user avatar |
| **Drop Zone** | Large dashed-border area for drag-and-drop file uploads, "Drop your files here" text, "Choose File" button |
| **Your Artifacts Grid** | Cards showing project name, description, version badges (v1, v2, v3), file/branch counts, collaborator avatars, timestamps |
| **New Artifact Button** | "+ New Artifact" action button |
| **Recent Activity Feed** | Timeline of user actions (comments, uploads) with avatars and timestamps |

**Recommended Future Task:** Create Task 00013 for "Dashboard Implementation"

### 11.2 Artifact Upload Modal (`artifact_upload-modal.png`)

Modal dialog for creating new artifacts:

| Element | Description |
|---------|-------------|
| **Title** | "Create New Artifact" |
| **Subtitle** | "Upload an HTML, Markdown, or ZIP package to start reviewing with your team." |
| **Upload Zone** | Dashed border drop zone with upload icon, "Drop file here or click to browse", "Choose File" button |
| **Supported formats** | .html, .md, .zip |
| **Project Name** | Required text input |
| **Description** | Optional textarea |
| **Actions** | "Cancel" (secondary) and "Create Project" (primary) buttons |

**Note:** This may already be covered by Task 00010 (Artifact Upload Creation) or Task 00011.
