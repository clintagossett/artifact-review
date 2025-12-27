# Subtask 06: Landing Page - FAQ, CTA, and Footer

**Parent Task:** 00012-beautify-homepage-signup-login
**Status:** OPEN
**Created:** 2025-12-26
**Completed:** _(pending)_

---

## Objective

Create the FAQ accordion, Final CTA banner, and Footer sections to complete the landing page.

---

## Dependencies

- **Subtask 02 (Foundation Setup):** Must be complete
  - Requires Accordion component from ShadCN
  - Requires Separator component from ShadCN
  - Requires brand colors and Inter font
- **Subtask 05 (Social Proof & Pricing):** Should be complete
  - Establishes section patterns

---

## Deliverables

| File | Description |
|------|-------------|
| `app/src/components/landing/FAQSection.tsx` | Expandable FAQ accordion |
| `app/src/components/landing/FinalCTASection.tsx` | Gradient banner with call-to-action |
| `app/src/components/landing/LandingFooter.tsx` | 4-column footer with links |
| `app/src/app/page.tsx` | Updated to include final sections (landing page complete) |

---

## Requirements

### 1. Create `FAQSection.tsx`

Expandable FAQ accordion:

**Layout:**
- Max-width container (max-w-3xl for narrow focus)
- Centered horizontally
- Vertical padding (py-16 md:py-24)
- Section ID for anchor link: `id="faq"`

**Section Header:**
- Eyebrow: "FAQ"
- Heading: "Frequently asked questions"
- Optional subtext: "Everything you need to know about Artifact Review"
- Centered alignment

**Accordion Component:**
- Use ShadCN Accordion component
- Single or multiple expand mode
- 5-7 FAQ items

**FAQ Content (suggested):**

1. **"What file types does Artifact Review support?"**
   - HTML files, Markdown files, and ZIP packages containing these formats. We're constantly adding support for more AI-native output formats.

2. **"How does the collaboration work?"**
   - Team members can leave comments directly on the artifact, see real-time updates, and track feedback status. It's like Google Docs but for AI outputs.

3. **"Is there a free plan?"**
   - Yes! Our free plan includes 3 active artifacts and basic collaboration features. Perfect for trying out the platform.

4. **"Can I use Artifact Review with my AI tools?"**
   - Absolutely. Artifact Review works with outputs from Claude, ChatGPT, Cursor, and any other AI agent that generates HTML or Markdown.

5. **"How secure is my data?"**
   - We use industry-standard encryption and security practices. Your artifacts are private by default and only shared with people you invite.

6. **"What's the difference between Pro and Team plans?"**
   - Pro is for individual professionals, while Team adds admin controls, SSO, and unlimited team members for organizations.

**Accordion Styling:**
- Clean borders between items
- Chevron or plus/minus icon for expand/collapse
- Smooth animation on expand
- Adequate padding for readability

### 2. Create `FinalCTASection.tsx`

Gradient banner with call-to-action:

**Layout:**
- Full-width section
- Gradient background: dark blue to purple (`from-blue-900 to-purple-900`)
- Vertical padding (py-16 md:py-20)
- All content centered

**Content:**
- Heading: "Ready to transform your review process?" (white text, large)
- Subtext: "Start free today. No credit card required." (white/light gray text)
- CTA buttons (horizontal on desktop, stacked on mobile):
  - "Start Free" - White background, dark text (primary)
  - "Schedule Demo" or "Contact Sales" - Outline/ghost white (secondary)

**Design Notes:**
- Strong contrast between gradient background and white text/buttons
- Could add subtle pattern or texture overlay
- Generous whitespace around buttons

### 3. Create `LandingFooter.tsx`

4-column footer with links:

**Layout:**
- Full-width section
- Dark or light background (gray-900 or gray-50)
- Max-width container (1280px)
- Vertical padding (py-12 md:py-16)

**Grid Structure:**
- 4 columns on desktop (grid-cols-4)
- 2 columns on tablet (grid-cols-2)
- Single column on mobile

**Column 1: Brand**
- Logo component (smaller version)
- Tagline or brief description
- Social media icons (optional):
  - Twitter/X
  - GitHub
  - LinkedIn

**Column 2: Product**
- Link: Features (/#features)
- Link: Pricing (/#pricing)
- Link: FAQ (/#faq)
- Link: Changelog (placeholder)

**Column 3: Company**
- Link: About (placeholder)
- Link: Blog (placeholder)
- Link: Careers (placeholder)
- Link: Contact (placeholder)

**Column 4: Legal**
- Link: Privacy Policy (placeholder)
- Link: Terms of Service (placeholder)
- Link: Cookie Policy (placeholder)

**Bottom Section:**
- Separator line
- Copyright text: "(c) 2025 Artifact Review. All rights reserved."
- Could include additional legal links inline

**Link Styling:**
- Text color appropriate for background (gray-400 on dark, gray-600 on light)
- Hover state (white or primary color)
- Reasonable spacing between links

---

## Reference Files

### Figma Source Code
- `/figma-designs/src/app/components/LandingPage.tsx` - Lines 554-675

### Figma Screenshots
- `/temp figma screenshots/home-page.png` - Shows final CTA with dark gradient

### Dependencies
- `/app/src/components/ui/accordion.tsx` - For FAQ section
- `/app/src/components/ui/separator.tsx` - For footer divider
- `/app/src/components/shared/Logo.tsx` - For footer brand

---

## Component Specifications

### FAQSection.tsx

```typescript
interface FAQSectionProps {
  className?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// Key elements
- Section container with id="faq"
- Section header
- Accordion component with FAQ items
```

### FinalCTASection.tsx

```typescript
interface FinalCTASectionProps {
  className?: string;
}

// Key elements
- Full-width gradient container
- Heading (h2)
- Subtext
- Button group (primary + secondary)
```

### LandingFooter.tsx

```typescript
interface LandingFooterProps {
  className?: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

// Key elements
- Footer container
- 4-column grid
- Brand column with logo
- Link columns
- Separator
- Copyright text
```

---

## Acceptance Criteria

- [ ] FAQSection has anchor id="faq" for header link
- [ ] FAQ displays 5-7 expandable items
- [ ] Accordion expands/collapses smoothly
- [ ] FinalCTA has dark blue-to-purple gradient background
- [ ] CTA buttons are clearly visible on dark background
- [ ] Footer displays 4-column grid on desktop
- [ ] Footer includes logo, product links, company links, legal links
- [ ] Footer has copyright with current year
- [ ] All sections responsive (stack on mobile)
- [ ] Landing page is complete with all 10 sections
- [ ] All anchor links work (Features, Pricing, FAQ)
- [ ] Page renders without errors

---

## Estimated Effort

1-2 hours

---

## How This Will Be Used

This subtask completes the landing page:
- FAQ addresses common questions to reduce friction
- Final CTA provides one last conversion opportunity
- Footer provides navigation and legal requirements
- Landing page is now ready for production
