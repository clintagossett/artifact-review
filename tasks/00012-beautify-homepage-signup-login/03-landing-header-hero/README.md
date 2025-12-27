# Subtask 03: Landing Page - Header and Hero

**Parent Task:** 00012-beautify-homepage-signup-login
**Status:** OPEN
**Created:** 2025-12-26
**Completed:** _(pending)_

---

## Objective

Create the landing page header navigation and hero section, establishing the top portion of the marketing page that visitors see first.

---

## Dependencies

- **Subtask 02 (Foundation Setup):** Must be complete
  - Requires Logo.tsx component
  - Requires brand colors in globals.css
  - Requires Inter font loaded

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/landing/LandingHeader.tsx` | Sticky header with logo, nav links, and CTA buttons |
| `app/src/components/landing/HeroSection.tsx` | Two-column hero with headline, CTAs, and product mockup |
| `app/src/app/page.tsx` | Updated to use new landing page components |

---

## Requirements

### 1. Create `LandingHeader.tsx`

Sticky header component with:

**Layout:**
- Full-width with max-width container (1280px)
- Horizontal padding (px-4 md:px-10)
- Fixed/sticky positioning at top
- White background with subtle bottom border or shadow
- Height approximately 64-72px

**Left Section:**
- Logo component (from shared/Logo.tsx)
- Links to homepage (/)

**Center Section (Desktop):**
- Navigation links: Features, Pricing, FAQ
- Anchor links to respective sections on page
- Hidden on mobile (md:flex)

**Right Section:**
- "Sign In" link/button (secondary style) - links to /login
- "Start Free" button (primary gradient style) - links to /register
- Mobile: hamburger menu or simplified nav

**Responsive Behavior:**
- Desktop (md+): Full navigation visible
- Mobile: Logo + simplified CTA buttons

### 2. Create `HeroSection.tsx`

Two-column hero section with:

**Layout:**
- Max-width container (1280px)
- Two-column grid on desktop (grid-cols-2)
- Single column on mobile (stacked)
- Generous vertical padding (py-16 md:py-24)

**Left Column (Content):**
- Gradient pill/badge: "AI-Powered Review Platform"
  - Purple/blue gradient background
  - Small text, rounded-full
- Main headline: "From AI output to stakeholder feedback in one click"
  - Large, bold text (text-4xl md:text-5xl lg:text-6xl)
  - font-bold or font-extrabold
- Subheadline/description
  - Gray text (text-gray-600)
  - Explain the value proposition
- CTA buttons:
  - "Start Free" - Primary gradient button (blue-to-purple)
  - "Watch Demo" or "Learn More" - Secondary/outline button
- Social proof element:
  - Avatar stack (5 overlapping avatars)
  - Text: "+1000 teams" or similar
  - Uses Avatar component from ShadCN

**Right Column (Visual):**
- Browser window mockup showing product
  - Rounded container with top bar (dots for window controls)
  - Screenshot or placeholder of product interface
  - Shadow effect (shadow-2xl)
- Alternatively, can use a placeholder illustration initially

### 3. Update `page.tsx`

Transform the homepage into landing page orchestrator:
- Import and render LandingHeader
- Import and render HeroSection
- Placeholder sections for content to come (Subtasks 04-06)
- Handle authenticated vs unauthenticated states:
  - Unauthenticated: Show full landing page
  - Authenticated: Could redirect to /dashboard or show dashboard preview

---

## Reference Files

### Figma Source Code
- `/figma-designs/src/app/components/LandingPage.tsx` - Lines 8-118 (Header and Hero)

### Figma Screenshots
- `/temp figma screenshots/home-page.png` - Visual reference for header and hero layout

### Current Implementation
- `/app/src/app/page.tsx` - Current homepage to replace/update
- `/app/src/components/shared/Logo.tsx` - Logo component from Subtask 02

---

## Component Specifications

### LandingHeader.tsx

```typescript
// Props
interface LandingHeaderProps {
  className?: string;
}

// Key elements
- <Logo /> component (links to /)
- Navigation links (Features, Pricing, FAQ) - anchor links
- Sign In button (Link to /login)
- Start Free button (Link to /register)
```

### HeroSection.tsx

```typescript
// Props
interface HeroSectionProps {
  className?: string;
}

// Key elements
- Badge component with gradient
- Heading (h1)
- Paragraph description
- Button group (primary + secondary)
- Avatar stack with count text
- Product mockup/visual
```

---

## Acceptance Criteria

- [ ] Header is sticky and remains visible when scrolling
- [ ] Logo links to homepage
- [ ] Navigation links scroll to page sections (Features, Pricing, FAQ)
- [ ] "Sign In" links to /login
- [ ] "Start Free" links to /register
- [ ] Hero displays gradient badge above headline
- [ ] Hero headline matches Figma ("From AI output to stakeholder feedback in one click")
- [ ] CTA buttons have correct gradient styling
- [ ] Avatar stack shows overlapping avatars with count
- [ ] Product mockup placeholder is visible
- [ ] Responsive: stacks properly on mobile (< 768px)
- [ ] Authenticated users see appropriate content (or redirect)

---

## Estimated Effort

2-3 hours

---

## How This Will Be Used

This subtask creates the first visible portion of the landing page:
- Header provides site-wide navigation pattern
- Hero establishes brand identity and primary conversion point
- Sets the visual tone for remaining sections (Subtasks 04-06)
