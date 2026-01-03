# Subtask 04: Landing Page - Content Sections

**Parent Task:** 00012-beautify-homepage-signup-login
**Status:** OPEN
**Created:** 2025-12-26
**Completed:** _(pending)_

---

## Objective

Create the Problem Statement, How It Works, and Features sections of the landing page that explain the product value proposition and capabilities.

---

## Dependencies

- **Subtask 02 (Foundation Setup):** Must be complete
  - Requires brand colors and Inter font
- **Subtask 03 (Header & Hero):** Should be complete
  - Establishes page structure in page.tsx

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/landing/ProblemSection.tsx` | Centered text explaining the pain point |
| `app/src/components/landing/HowItWorksSection.tsx` | 3-step cards showing the workflow |
| `app/src/components/landing/FeaturesSection.tsx` | Two alternating feature sections with visuals |
| `app/src/app/page.tsx` | Updated to include new sections |

---

## Requirements

### 1. Create `ProblemSection.tsx`

Centered text section explaining the problem:

**Layout:**
- Full-width section with subtle background (gray-50 or similar)
- Max-width container for text (max-w-3xl)
- Centered horizontally
- Vertical padding (py-16 md:py-24)

**Content:**
- Section label/eyebrow: "The Problem" or similar (small, uppercase, text-gray-500)
- Main heading: Describe the pain point
  - Example: "AI generates amazing outputs. But getting feedback is still painful."
  - Large text (text-3xl md:text-4xl), centered
- Supporting paragraph (optional)
  - Gray text explaining the problem in more detail

**Design:**
- Clean, minimal styling
- Focus on typography
- No images or complex layouts

### 2. Create `HowItWorksSection.tsx`

3-step process explanation:

**Layout:**
- Max-width container (1280px)
- Vertical padding (py-16 md:py-24)
- Section heading at top

**Section Header:**
- Eyebrow: "How It Works" (small, uppercase)
- Heading: "Get feedback in three simple steps"
- Centered alignment

**Step Cards:**
- 3-column grid on desktop (grid-cols-3)
- Single column on mobile (stacked)
- Gap between cards (gap-8)

**Each Step Card:**
- Step number indicator (1, 2, 3) - circular badge with gradient or border
- Icon representing the step (from Lucide):
  - Step 1: Upload icon - "Upload"
  - Step 2: Share2 or Link icon - "Share"
  - Step 3: MessageCircle icon - "Get Feedback"
- Title (font-semibold)
- Description paragraph (text-gray-600)
- Card styling: rounded-xl, subtle shadow or border

### 3. Create `FeaturesSection.tsx`

Two alternating feature blocks:

**Layout:**
- Max-width container (1280px)
- Vertical padding (py-16 md:py-24)
- Each feature is a two-column layout
- Alternating: Image left/text right, then text left/image right

**Section Header:**
- Eyebrow: "Features" (small, uppercase)
- Heading: "Everything you need for seamless reviews"
- Centered or left-aligned

**Feature Block Structure:**
- Two columns on desktop (grid-cols-2)
- Single column on mobile (stacked)
- Gap between columns (gap-12)

**Content Column (per feature):**
- Feature title (text-2xl, font-semibold)
- Description paragraph (text-gray-600)
- Feature list with check icons:
  - 3-4 bullet points per feature
  - Check icon (green or brand color) + text
- Optional: CTA link or button

**Visual Column (per feature):**
- Placeholder image or screenshot
- Rounded corners (rounded-xl)
- Shadow effect (shadow-lg)
- Could be product screenshots or illustrations

**Suggested Features:**
1. **Real-time Collaboration**
   - Live comments and annotations
   - Team presence indicators
   - Instant notifications
2. **AI-Native Workflow**
   - Support for HTML, Markdown, ZIP packages
   - Version comparison
   - Direct from AI agent output

---

## Reference Files

### Figma Source Code
- `/figma-designs/src/app/components/LandingPage.tsx` - Lines 120-321

### Figma Screenshots
- `/temp figma screenshots/home-page.png` - Visual reference for section layouts

### Current Implementation
- `/app/src/app/page.tsx` - Page orchestrator to update

---

## Component Specifications

### ProblemSection.tsx

```typescript
interface ProblemSectionProps {
  className?: string;
}

// Key elements
- Section container with background
- Eyebrow text
- Heading (h2)
- Optional paragraph
```

### HowItWorksSection.tsx

```typescript
interface HowItWorksSectionProps {
  className?: string;
}

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

// Key elements
- Section container
- Section header (eyebrow + heading)
- 3 StepCard components
```

### FeaturesSection.tsx

```typescript
interface FeaturesSectionProps {
  className?: string;
}

interface Feature {
  title: string;
  description: string;
  bulletPoints: string[];
  imageSrc: string;
  imageAlt: string;
  reversed?: boolean; // For alternating layout
}

// Key elements
- Section container
- Section header (eyebrow + heading)
- 2 FeatureBlock components (alternating layout)
```

---

## Acceptance Criteria

- [ ] ProblemSection displays centered text with problem statement
- [ ] ProblemSection has subtle background differentiation
- [ ] HowItWorksSection shows 3 step cards in grid
- [ ] Each step has number, icon, title, and description
- [ ] Step cards have consistent styling (rounded, shadow)
- [ ] FeaturesSection displays 2 feature blocks
- [ ] Feature blocks alternate image/text positions
- [ ] Feature lists show check icons with bullet points
- [ ] All sections responsive (stack on mobile)
- [ ] Sections integrated into page.tsx in correct order
- [ ] Anchor links from header work (id attributes set)

---

## Estimated Effort

2-3 hours

---

## How This Will Be Used

These sections form the core content of the landing page:
- Problem section hooks visitors by identifying with their pain
- How It Works reduces friction by showing simplicity
- Features provide detailed value proposition
- Feeds into Subtask 05 (Social Proof & Pricing) and Subtask 06 (FAQ, CTA, Footer)
