# Subtask 05: Landing Page - Social Proof and Pricing

**Parent Task:** 00012-beautify-homepage-signup-login
**Status:** OPEN
**Created:** 2025-12-26
**Completed:** _(pending)_

---

## Objective

Create the Social Proof (testimonials and stats) and Pricing sections of the landing page that build trust and present pricing options.

---

## Dependencies

- **Subtask 02 (Foundation Setup):** Must be complete
  - Requires Avatar component from ShadCN
  - Requires Badge component from ShadCN
  - Requires brand colors and Inter font
- **Subtask 04 (Content Sections):** Should be complete
  - Establishes content section patterns

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/landing/SocialProofSection.tsx` | Testimonials cards and stats metrics |
| `app/src/components/landing/PricingSection.tsx` | 3-tier pricing cards (Free, Pro, Team) |
| `app/src/app/page.tsx` | Updated to include new sections |

---

## Requirements

### 1. Create `SocialProofSection.tsx`

Two-part section: Testimonials + Stats

**Layout:**
- Max-width container (1280px)
- Vertical padding (py-16 md:py-24)
- Optional subtle background (gray-50)

**Section Header:**
- Eyebrow: "Trusted by Teams" or "What Teams Say"
- Heading: "Loved by teams worldwide"
- Centered alignment

#### Part A: Testimonials (3 cards)

**Grid Layout:**
- 3-column grid on desktop (grid-cols-3)
- Single column on mobile
- Gap between cards (gap-6 md:gap-8)

**Each Testimonial Card:**
- White background
- Rounded corners (rounded-xl)
- Subtle shadow (shadow-sm) or border
- Padding (p-6)

**Card Content:**
- Star rating (5 stars) - use Star icon from Lucide, filled yellow
- Quote text (text-gray-700)
- Author section:
  - Avatar (40px, rounded-full)
  - Name (font-semibold)
  - Role/Company (text-gray-500, text-sm)

**Sample Testimonials (can be placeholder):**
1. "Artifact Review transformed our feedback process. What used to take days now happens in hours."
2. "The real-time collaboration is a game-changer for our distributed team."
3. "Finally, a tool that understands AI-native workflows."

#### Part B: Stats (3 metrics)

**Layout:**
- 3-column grid on desktop (grid-cols-3)
- Centered within container
- Gap between stats (gap-8 md:gap-16)
- Can be below testimonials or in a separate row

**Each Stat:**
- Large number (text-4xl md:text-5xl, font-bold)
- Label below (text-gray-600)
- Centered text

**Stats (from Figma screenshots):**
- "500+" - Teams using Artifact Review
- "10,000+" - Artifacts reviewed
- "2.5 hrs" - Average time saved per review

### 2. Create `PricingSection.tsx`

3-tier pricing comparison:

**Layout:**
- Max-width container (1280px)
- Vertical padding (py-16 md:py-24)
- Section ID for anchor link: `id="pricing"`

**Section Header:**
- Eyebrow: "Pricing"
- Heading: "Simple, transparent pricing"
- Subtext: "Start free, upgrade when you need to"
- Centered alignment

**Pricing Grid:**
- 3-column grid on desktop (grid-cols-3)
- Single column on mobile
- Gap between cards (gap-8)
- Center card (Pro) slightly elevated or featured

#### Tier 1: Free

**Card Styling:**
- White background
- Rounded corners (rounded-xl)
- Border (border-gray-200)
- Padding (p-6 md:p-8)

**Content:**
- Tier name: "Free" (font-semibold)
- Price: "$0" (text-4xl, font-bold)
- Period: "/month" (text-gray-500)
- Description: "Perfect for trying out Artifact Review"
- Feature list with check icons:
  - 3 active artifacts
  - Basic collaboration
  - 7-day history
  - Community support
- CTA button: "Get Started" (secondary/outline style)

#### Tier 2: Pro (Featured)

**Card Styling:**
- White background with blue or gradient border
- OR: subtle gradient background
- Rounded corners (rounded-2xl)
- Shadow (shadow-lg)
- "Most Popular" badge at top
- Padding (p-6 md:p-8)

**Content:**
- Tier name: "Pro" (font-semibold)
- Price: "$12" (text-4xl, font-bold)
- Period: "/month" (text-gray-500)
- Description: "For professionals and small teams"
- Feature list with check icons:
  - Unlimited artifacts
  - Advanced collaboration
  - 90-day history
  - Priority support
  - Version comparison
  - Custom branding
- CTA button: "Start Free Trial" (primary gradient style)

#### Tier 3: Team

**Card Styling:**
- Same as Free tier (not featured)
- Standard border and shadow

**Content:**
- Tier name: "Team" (font-semibold)
- Price: "$18" (text-4xl, font-bold)
- Period: "/user/month" (text-gray-500)
- Description: "For growing teams and organizations"
- Feature list with check icons:
  - Everything in Pro
  - Unlimited team members
  - Admin controls
  - SSO integration
  - Audit logs
  - Dedicated support
- CTA button: "Contact Sales" (secondary style)

---

## Reference Files

### Figma Source Code
- `/figma-designs/src/app/components/LandingPage.tsx` - Lines 323-552

### Figma Screenshots
- `/temp figma screenshots/home-page.png` - Shows pricing cards ($0, $12, $18)

### Dependencies
- `/app/src/components/ui/avatar.tsx` - For testimonial avatars
- `/app/src/components/ui/badge.tsx` - For "Most Popular" label
- `/app/src/components/ui/card.tsx` - Base card styling

---

## Component Specifications

### SocialProofSection.tsx

```typescript
interface SocialProofSectionProps {
  className?: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
  rating: number; // 1-5
}

interface Stat {
  value: string;
  label: string;
}

// Key elements
- Section container
- Section header
- Testimonial cards grid
- Stats row
```

### PricingSection.tsx

```typescript
interface PricingSectionProps {
  className?: string;
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  featured?: boolean;
}

// Key elements
- Section container with id="pricing"
- Section header
- Pricing cards grid
- Featured card styling for Pro tier
```

---

## Acceptance Criteria

- [ ] SocialProofSection displays 3 testimonial cards
- [ ] Each testimonial has star rating, quote, and author info
- [ ] Stats section shows 3 metrics (500+, 10,000+, 2.5 hrs)
- [ ] Stats have large numbers with labels
- [ ] PricingSection has anchor id="pricing" for header link
- [ ] 3 pricing tiers displayed (Free, Pro, Team)
- [ ] Pro tier is visually featured (badge, shadow, gradient)
- [ ] Each tier shows price, description, and feature list
- [ ] Feature lists use check icons
- [ ] CTA buttons link appropriately (/register, /contact)
- [ ] Responsive: cards stack on mobile
- [ ] Consistent styling with design system

---

## Estimated Effort

2-3 hours

---

## How This Will Be Used

These sections build credibility and drive conversion:
- Social proof establishes trust through testimonials and metrics
- Pricing provides clear path to signup/upgrade
- Feeds into Subtask 06 (FAQ, CTA, Footer) for page completion
