# Landing Page Design Brief - Figma Prompt

**Project:** AI Artifact Collaboration Platform Landing Page
**Status:** Design Brief
**Created:** December 24, 2024
**Version:** 1.0

---

## Design Overview

Create a modern, professional SaaS landing page for an AI artifact collaboration platform. The design should feel **technical but accessible**, **trustworthy**, and **efficient**—appealing to product managers and design teams who use AI tools like Claude Code and Cursor.

**Design Philosophy:**
- Clean, uncluttered layouts with generous whitespace
- Focus on clarity and speed (users should instantly understand the value)
- Professional SaaS aesthetic (think Linear, Notion, Figma—not flashy startup)
- Trust signals prominent (security, integrations, testimonials)
- Mobile-responsive design required

---

## Brand Positioning

### Primary Message
**"From AI output to stakeholder feedback in one click"**

### Core Value Propositions
1. **AI-Native by Design** - Built specifically for AI-generated HTML artifacts
2. **Zero Format Loss** - Preserve AI output perfectly, no copy-paste degradation
3. **Stakeholder Access Without Licenses** - Reviewers don't need AI tool accounts
4. **Structured Review Workflow** - More than comments: approval gates, due dates, status tracking
5. **Multi-Tool, Best-of-Breed** - Works with Claude Code, Cursor, ChatGPT, any AI tool

### Target Audience
- **Primary:** Product managers (PMs) at tech companies using AI tools
- **Secondary:** Design leads, engineering managers, consultancies
- **Profile:** Tool-agnostic teams, best-of-breed approach (Notion + Linear + Slack)
- **Pain:** Waste 2-5 hours/week converting AI output to shareable formats

---

## Design System

### Color Palette

**Primary Colors:**
- **Brand Primary (Blue):** #2563EB (Trust, tech, clarity)
  - Use for: Primary CTAs, links, key UI elements
  - Tints: #3B82F6 (hover), #1E40AF (active)
- **Brand Secondary (Purple):** #7C3AED (AI/innovation)
  - Use for: Accents, badges, "AI-native" messaging
  - Tints: #8B5CF6 (hover), #6D28D9 (active)

**Neutral Colors:**
- **Text Primary:** #111827 (almost black)
- **Text Secondary:** #6B7280 (medium gray)
- **Text Tertiary:** #9CA3AF (light gray)
- **Background:** #FFFFFF (white)
- **Background Alt:** #F9FAFB (off-white, for sections)
- **Borders:** #E5E7EB (light gray)

**Semantic Colors:**
- **Success (Green):** #10B981
- **Warning (Amber):** #F59E0B
- **Error (Red):** #EF4444
- **Info (Blue):** #3B82F6

**Gradients (Use Sparingly):**
- Hero Gradient: `linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)`
- Subtle Background: `linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)`

---

### Typography

**Font Family:**
- **Primary:** Inter (headings, body, UI)
  - Clean, modern, excellent readability
  - Variable font for precise weight control
- **Monospace (code/technical):** JetBrains Mono or Fira Code
  - Use for code snippets, file names, technical terms

**Type Scale:**
- **Hero Headline (H1):** 56px / 3.5rem, font-weight: 700, line-height: 1.1
- **Section Headline (H2):** 40px / 2.5rem, font-weight: 700, line-height: 1.2
- **Subsection Headline (H3):** 32px / 2rem, font-weight: 600, line-height: 1.3
- **Feature Title (H4):** 24px / 1.5rem, font-weight: 600, line-height: 1.4
- **Body Large:** 20px / 1.25rem, font-weight: 400, line-height: 1.6
- **Body Regular:** 16px / 1rem, font-weight: 400, line-height: 1.6
- **Body Small:** 14px / 0.875rem, font-weight: 400, line-height: 1.5
- **Caption:** 12px / 0.75rem, font-weight: 500, line-height: 1.4

**Text Styles:**
- Use **font-weight: 600** for emphasis (not bold/700 in body text)
- Use **#6B7280** (text-secondary) for supporting text
- Line-height: 1.6 for readability in body text

---

### Spacing System

Use 8px base grid for all spacing:
- **XXS:** 4px (tight spacing)
- **XS:** 8px (compact)
- **SM:** 16px (default element spacing)
- **MD:** 24px (between related groups)
- **LG:** 32px (between sections)
- **XL:** 48px (major sections)
- **2XL:** 64px (hero, large sections)
- **3XL:** 96px (section dividers)

**Container Widths:**
- **Max Content Width:** 1280px (center-aligned)
- **Text Max Width:** 720px (for readability)
- **Section Padding (Desktop):** 80px vertical, 40px horizontal
- **Section Padding (Mobile):** 48px vertical, 24px horizontal

---

### Component Styles

**Buttons:**

**Primary CTA:**
- Background: #2563EB
- Text: #FFFFFF, 16px, font-weight: 600
- Padding: 14px 32px
- Border-radius: 8px
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Hover: Background #3B82F6, Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
- Active: Background #1E40AF

**Secondary CTA:**
- Background: #FFFFFF
- Text: #2563EB, 16px, font-weight: 600
- Border: 2px solid #E5E7EB
- Padding: 14px 32px
- Border-radius: 8px
- Hover: Border #2563EB, Background #F9FAFB

**Text Link:**
- Text: #2563EB, underline on hover
- Font-weight: 500

**Cards:**
- Background: #FFFFFF
- Border: 1px solid #E5E7EB
- Border-radius: 12px
- Padding: 32px (desktop), 24px (mobile)
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.05)
- Hover: Shadow: 0 4px 12px rgba(0, 0, 0, 0.08)

**Badges/Pills:**
- Background: #EEF2FF (light blue) or #F3E8FF (light purple)
- Text: #2563EB or #7C3AED, 12px, font-weight: 600
- Padding: 4px 12px
- Border-radius: 12px (fully rounded)

**Input Fields:**
- Background: #FFFFFF
- Border: 1px solid #D1D5DB
- Border-radius: 8px
- Padding: 12px 16px
- Font-size: 16px
- Focus: Border #2563EB, Shadow: 0 0 0 3px rgba(37, 99, 235, 0.1)

---

## Page Structure & Sections

### Section 1: Hero (Above the Fold)

**Layout:**
- Full-width container, max 1280px centered
- Two-column layout (desktop): 50% text / 50% visual
- Single column (mobile): Text stacked above visual

**Content - Left Column:**

**Badge (optional):**
> "New: One-click sharing from Claude Code" [Badge: #F3E8FF background, #7C3AED text]

**Headline (H1):**
> "From AI output to stakeholder feedback in one click"

**Subheadline (Body Large, text-secondary):**
> "Share HTML artifacts from Claude Code, Cursor, or any AI tool. Get inline feedback from your team. Zero format loss."

**CTA Group (horizontal stack, 16px gap):**
- **Primary CTA:** "Start Free" → Links to signup
- **Secondary CTA:** "See Demo" → Links to demo video or interactive tour
- **Text below CTAs (caption, text-tertiary):** "No credit card required • 3 documents free forever"

**Social Proof (below CTAs, 24px gap):**
- Small avatars (5-7 user photos, overlapping)
- Text: "Trusted by 500+ product teams at tech companies"

---

**Content - Right Column:**

**Visual Options (choose one):**

**Option A: Product Screenshot**
- High-fidelity screenshot of the platform showing:
  - Clean HTML document rendered beautifully
  - Inline comment threads visible on the right
  - Version history panel on left
  - Light shadow/border to frame the screenshot
  - Subtle gradient background behind screenshot for depth

**Option B: Animated Demo**
- GIF or video showing:
  1. User drags HTML file into upload area
  2. Document instantly renders
  3. User clicks "Share" → shareable link appears
  4. Reviewer clicks link, adds inline comment
  5. Comment appears in thread, assigned to owner
- Frame with device mockup (browser window)

**Option C: Abstract Workflow Illustration**
- Visual flow diagram:
  - AI tool icon (Claude, Cursor) → HTML file → Platform logo → Team avatars + comment bubbles
  - Clean, minimal, geometric shapes
  - Use brand colors (blue/purple gradient)

**Recommendation:** Use **Option A (Product Screenshot)** for credibility, or **Option B (Animated Demo)** for engagement.

---

### Section 2: Problem Statement (Why This Matters)

**Layout:**
- Centered text block, max 720px width
- Background: #F9FAFB (off-white section)
- Padding: 80px vertical (desktop), 48px (mobile)

**Content:**

**Overline (caption, text-tertiary, uppercase, letter-spacing: 0.05em):**
> "THE PROBLEM"

**Headline (H2, centered):**
> "AI tools generate HTML. Collaboration tools break it."

**Body Text (Body Regular, text-secondary, centered):**
> "Product managers using Claude Code and Cursor generate PRDs, specs, and prototypes as HTML—perfectly formatted with tables, code blocks, and styling. But sharing with stakeholders means copying to Google Docs (formatting breaks), sending screenshots (no interactivity), or zipping files (no collaboration). You waste 2-3 hours per week reformatting. We fix that."

**Visual (optional):**
- Three-column comparison:
  - **Before (Google Docs):** Screenshot of broken table/formatting [Red X overlay]
  - **Before (Screenshots):** Static image, no comments [Red X overlay]
  - **After (Platform):** Perfect HTML + inline comments [Green checkmark]

---

### Section 3: How It Works (User Journey)

**Layout:**
- Full-width container, max 1280px centered
- Background: #FFFFFF
- Padding: 96px vertical (desktop), 64px (mobile)

**Content:**

**Overline (caption, text-tertiary, uppercase):**
> "HOW IT WORKS"

**Headline (H2, centered):**
> "Upload. Share. Get feedback. In 3 clicks."

**Steps (horizontal cards, 3 columns desktop / stacked mobile):**

---

**Step 1 Card:**
- **Icon:** Upload icon (cloud with arrow up) [#2563EB]
- **Badge:** "Step 1" [#EEF2FF background]
- **Title (H4):** "Upload HTML"
- **Body (Body Regular):** "Drag and drop your HTML file, or use our Claude Code MCP integration for one-click sharing. Renders instantly, perfectly formatted."
- **Visual (below text):** Small screenshot showing drag-drop upload area

---

**Step 2 Card:**
- **Icon:** Share icon (link chain) [#2563EB]
- **Badge:** "Step 2" [#EEF2FF background]
- **Title (H4):** "Share with Your Team"
- **Body (Body Regular):** "Get a shareable link in seconds. Invite reviewers via email—they can comment without creating accounts or paying for licenses."
- **Visual (below text):** Screenshot of shareable link modal + email invite

---

**Step 3 Card:**
- **Icon:** Comments icon (speech bubbles) [#2563EB]
- **Badge:** "Step 3" [#EEF2FF background]
- **Title (H4):** "Get Inline Feedback"
- **Body (Body Regular):** "Reviewers highlight text, leave comments, @mention teammates. You assign, resolve, and track progress—all in one place."
- **Visual (below text):** Screenshot of inline comment thread

---

**Below Steps (centered, 32px gap):**
- **Secondary CTA:** "Watch 2-Minute Demo" [Links to video]

---

### Section 4: Key Features (Value Propositions)

**Layout:**
- Background: #F9FAFB (alternating section)
- Padding: 96px vertical (desktop), 64px (mobile)
- Two-column layout (flip alternating rows for visual rhythm)

**Content:**

**Overline (caption, text-tertiary, uppercase):**
> "KEY FEATURES"

**Headline (H2, centered, max 720px width):**
> "Built for AI-native teams. Works with your entire stack."

---

**Feature 1 (Left: Text, Right: Visual):**

**Badge:** "AI-Native" [#F3E8FF background, #7C3AED text]

**Title (H3):** "Zero Format Loss"

**Body (Body Large, text-secondary):**
> "What AI generates is what stakeholders see. No copy-paste degradation, no 30-minute cleanup. Tables, code blocks, diagrams—everything stays pixel-perfect."

**Proof Points (bulleted list):**
- Upload HTML directly, renders beautifully
- Responsive design preserved
- Export with comments baked in

**Visual (right column):**
- Side-by-side comparison:
  - Left: Google Docs (broken table, lost styling) [label: "Google Docs"]
  - Right: Platform (perfect formatting) [label: "Our Platform"]

---

**Feature 2 (Left: Visual, Right: Text) [Flip layout]:**

**Badge:** "Collaboration" [#EEF2FF background, #2563EB text]

**Title (H3):** "Reviewers Don't Need Licenses"

**Body (Body Large, text-secondary):**
> "Share with executives, clients, and cross-functional partners—no AI tool accounts required. Only creators pay for uploads. Reviewers comment for free, always."

**Proof Points (bulleted list):**
- Claude Team Projects requires $30-60/user for everyone
- We remove that barrier—reviewers are always free
- Invite anyone with an email address

**Visual (left column):**
- Illustration showing:
  - Creator (paid user, checkmark badge)
  - 5 Reviewer avatars (all with "Free" label)
  - Comment bubbles from each reviewer

---

**Feature 3 (Left: Text, Right: Visual):**

**Badge:** "Workflow" [#EEF2FF background, #2563EB text]

**Title (H3):** "Structured Review Workflow"

**Body (Body Large, text-secondary):**
> "More than just comments. Assign reviewers, set due dates, track approval status. Draft → In Review → Approved. Built for professional teams."

**Proof Points (bulleted list):**
- Assign reviewers, track completion
- Due dates with automated reminders
- Team activity feed (who reviewed what, when)

**Visual (right column):**
- Screenshot showing:
  - Document with status badge: "In Review"
  - Assigned reviewers list with checkmarks
  - Due date: "Jan 15, 2025"
  - Activity timeline on right side

---

**Feature 4 (Left: Visual, Right: Text) [Flip layout]:**

**Badge:** "Integrations" [#EEF2FF background, #2563EB text]

**Title (H3):** "Works with Your Entire Stack"

**Body (Body Large, text-secondary):**
> "Import from Claude Code, Cursor, ChatGPT, or any AI tool. Integrate with Slack, Linear, and Notion. Lightweight workflow—fits into your stack, doesn't replace it."

**Proof Points (bulleted list):**
- Claude Code MCP integration (one-click sharing)
- Slack notifications for new comments
- Linear/Jira linking for tying docs to tickets

**Visual (left column):**
- Integration logos in a grid:
  - Claude Code logo
  - Cursor logo
  - ChatGPT logo
  - Slack logo
  - Linear logo
  - Notion logo
  - [All logos grayscale, subtle hover to color]

---

### Section 5: Social Proof (Testimonials & Trust Signals)

**Layout:**
- Full-width background: Subtle gradient (#F9FAFB to #FFFFFF)
- Padding: 80px vertical (desktop), 48px (mobile)
- Max 1280px container

**Content:**

**Overline (caption, text-tertiary, uppercase):**
> "TRUSTED BY PRODUCT TEAMS"

**Headline (H2, centered):**
> "Saving 2-3 hours per week for teams like yours"

---

**Testimonials (3-column grid, desktop / stacked mobile):**

**Testimonial Card 1:**
- **Quote (Body Large, italic):** "We used to waste 30 minutes per PRD reformatting in Google Docs. Now we upload HTML, share a link, and get feedback in hours—not days."
- **Author:** Alex Chen, Product Manager
- **Company:** TechCorp (or placeholder logo)
- **Avatar:** Circular user photo (32px)
- **Rating (optional):** 5 stars ⭐⭐⭐⭐⭐

**Testimonial Card 2:**
- **Quote (Body Large, italic):** "Finally, a tool that preserves the quality of AI-generated artifacts. Our design team loves the pixel-perfect fidelity."
- **Author:** Morgan Taylor, Design Lead
- **Company:** StartupX (or placeholder logo)
- **Avatar:** Circular user photo (32px)
- **Rating (optional):** 5 stars

**Testimonial Card 3:**
- **Quote (Body Large, italic):** "Reviewers don't need Claude Code licenses—that alone saves us $2,000/month. And the review workflow is way more structured than Google Docs."
- **Author:** Jamie Rodriguez, Engineering Manager
- **Company:** ScaleUp Inc (or placeholder logo)
- **Avatar:** Circular user photo (32px)
- **Rating (optional):** 5 stars

---

**Trust Signals (below testimonials, centered):**

**Logos / Badges (grayscale, subtle):**
- "SOC 2 Compliant" badge (or "Security First")
- "GDPR Ready" badge
- "99.9% Uptime" stat
- Partner logos (if any): Claude, Convex, etc.

**Stats (3-column, centered):**
- **500+** Teams using the platform
- **10,000+** Documents reviewed
- **2.5 hrs** Average time saved per week

---

### Section 6: Pricing (Simplified)

**Layout:**
- Background: #FFFFFF
- Padding: 96px vertical (desktop), 64px (mobile)
- Max 1280px container

**Content:**

**Overline (caption, text-tertiary, uppercase):**
> "SIMPLE, TRANSPARENT PRICING"

**Headline (H2, centered):**
> "Start free. Upgrade when you're ready."

**Subheadline (Body Regular, text-secondary, centered):**
> "Creators pay. Reviewers comment for free—always."

---

**Pricing Cards (3-column grid, desktop / stacked mobile):**

---

**Free Plan Card:**
- **Background:** #F9FAFB (subtle off-white)
- **Border:** 1px solid #E5E7EB
- **Badge:** "Free Forever" [#10B981 background, white text]
- **Price:** $0 [H1 size]
- **Billing:** "Per month" [Caption, text-tertiary]
- **Features (bulleted list, Body Small):**
  - 3 documents
  - 3 versions per document
  - 7-day review period
  - 5 reviewers per document
  - Basic commenting
  - Email notifications
- **CTA:** "Start Free" [Secondary button, full-width]

---

**Pro Plan Card (Highlighted):**
- **Background:** #FFFFFF
- **Border:** 2px solid #2563EB (highlighted)
- **Badge:** "Most Popular" [#2563EB background, white text]
- **Price:** $12 [H1 size]
- **Billing:** "Per month" [Caption, text-tertiary]
- **Savings note:** "or $10/mo billed annually" [Caption, text-secondary]
- **Features (bulleted list, Body Small):**
  - **Unlimited documents** [Bold]
  - **Unlimited versions** [Bold]
  - Unlimited review period
  - Unlimited reviewers
  - Advanced commenting
  - Version history & diff view
  - Custom branding
  - Priority support
- **CTA:** "Start 14-Day Trial" [Primary button, full-width]
- **Note below CTA:** "No credit card required" [Caption, text-tertiary]

---

**Team Plan Card:**
- **Background:** #F9FAFB (subtle off-white)
- **Border:** 1px solid #E5E7EB
- **Badge:** "Teams 3+" [#7C3AED background, white text]
- **Price:** $18 [H1 size]
- **Billing:** "Per user/month" [Caption, text-tertiary]
- **Savings note:** "or $15/user/mo billed annually" [Caption, text-secondary]
- **Features (bulleted list, Body Small):**
  - **Everything in Pro, plus:**
  - Team workspace & folders
  - Approval workflow
  - Due dates & reminders
  - SSO (Google, Microsoft)
  - Audit logs
  - Slack integration
  - Priority support + onboarding
- **CTA:** "Contact Sales" [Secondary button, full-width]

---

**Below Pricing Cards (centered):**
- **Text Link:** "Need enterprise features? [Contact us for custom pricing](mailto:sales@platform.com)" [Body Small, link]
- **FAQ Link:** "See pricing FAQ →" [Text link, #2563EB]

---

### Section 7: FAQ (Optional, Accordion Style)

**Layout:**
- Background: #F9FAFB
- Padding: 80px vertical (desktop), 48px (mobile)
- Max 720px container (centered)

**Content:**

**Headline (H2, centered):**
> "Frequently Asked Questions"

**FAQ Accordion (expand/collapse):**

**Q1:** "Why not just use Google Docs?"
**A1:** "Google Docs breaks HTML formatting—tables, code blocks, and styling get lost. We preserve AI output perfectly, with zero format degradation."

**Q2:** "Do reviewers need to create accounts?"
**A2:** "No. Reviewers can comment with just an email address—no signup required. Only document creators (uploaders) need paid plans."

**Q3:** "How does MCP integration work?"
**A3:** "With our Claude Code MCP server, you can share documents directly from Claude Code in one click. No manual upload needed."

**Q4:** "Is my data secure?"
**A4:** "Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We're SOC 2 compliant and GDPR-ready. [Read our security page →]"

**Q5:** "Can I export documents with comments?"
**A5:** "Yes, on Pro and Team plans. You can export HTML with comments baked in as annotations, perfect for handoff to stakeholders."

**Q6:** "What AI tools do you support?"
**A6:** "Any AI tool that generates HTML—Claude Code, Cursor, ChatGPT, Gemini, and more. Upload HTML from any source."

---

### Section 8: Final CTA (Hero Reprise)

**Layout:**
- Full-width background: Gradient (#2563EB to #7C3AED)
- Text color: #FFFFFF
- Padding: 96px vertical (desktop), 64px (mobile)
- Centered content, max 720px width

**Content:**

**Headline (H2, white text):**
> "Stop screenshotting and emailing. Start collaborating."

**Subheadline (Body Large, white text, opacity: 0.9):**
> "Join 500+ product teams saving 2-3 hours per week. Free to start, upgrade anytime."

**CTA Group (centered, 16px gap):**
- **Primary CTA (white button with blue text):** "Start Free" → Signup
- **Secondary CTA (transparent button, white border, white text):** "Watch Demo" → Video

**Text below CTAs (caption, white text, opacity: 0.8):**
> "No credit card required • 3 documents free forever"

---

### Section 9: Footer

**Layout:**
- Background: #111827 (dark)
- Text color: #9CA3AF (light gray)
- Padding: 64px vertical, 40px horizontal
- Max 1280px container

**Content:**

**Footer Grid (4 columns desktop / stacked mobile):**

---

**Column 1: Brand**
- **Logo:** Platform logo (white version)
- **Tagline (Body Small):** "From AI output to stakeholder feedback in one click"
- **Social Links (icons, 32px gap):**
  - Twitter/X icon → [Link]
  - LinkedIn icon → [Link]
  - GitHub icon → [Link]

---

**Column 2: Product**
- **Heading:** "Product" [Body Small, font-weight: 600]
- **Links (Body Small, text-secondary):**
  - Features
  - Pricing
  - Integrations
  - Security
  - Changelog
  - Roadmap

---

**Column 3: Resources**
- **Heading:** "Resources" [Body Small, font-weight: 600]
- **Links (Body Small, text-secondary):**
  - Documentation
  - API Reference
  - Blog
  - Help Center
  - Community
  - Status Page

---

**Column 4: Company**
- **Heading:** "Company" [Body Small, font-weight: 600]
- **Links (Body Small, text-secondary):**
  - About
  - Careers
  - Contact
  - Privacy Policy
  - Terms of Service
  - GDPR

---

**Footer Bottom (below grid, 32px gap, border-top: 1px solid #374151):**
- **Left:** "© 2025 [Platform Name]. All rights reserved." [Caption, text-tertiary]
- **Right:** "Built with ❤️ for AI-native teams" [Caption, text-tertiary]

---

## Responsive Design Guidelines

### Breakpoints
- **Mobile:** 320px - 767px
- **Tablet:** 768px - 1023px
- **Desktop:** 1024px+

### Mobile Adjustments
- **Hero:** Stack text above visual, reduce headline to 36px
- **Features:** Single column, reduce spacing to 48px between sections
- **Pricing:** Stack cards vertically, full-width CTAs
- **Footer:** Stack columns vertically, center-align text

### Tablet Adjustments
- **Hero:** Maintain two-column layout, slightly reduce spacing
- **Features:** Maintain two-column layout
- **Pricing:** Two columns (Free + Pro row 1, Team row 2)

---

## Interactions & Animations (Optional)

**Hover States:**
- **Buttons:** Lift shadow, slight scale (1.02x)
- **Cards:** Lift shadow, subtle glow
- **Links:** Underline appears on hover
- **Testimonial cards:** Subtle border color change

**Scroll Animations (subtle):**
- **Fade-in on scroll:** Feature cards, testimonials (opacity: 0 → 1)
- **Slide-in on scroll:** Steps in "How It Works" (stagger 100ms delay)
- **Counter animation:** Stats in social proof section (count up from 0)

**Micro-interactions:**
- **CTA button:** Ripple effect on click
- **Accordion FAQ:** Smooth expand/collapse (300ms ease)
- **Badge pulse:** "New" badge subtle pulse animation (optional)

---

## Accessibility Requirements

- **Color Contrast:** All text meets WCAG AA standards (4.5:1 ratio)
- **Keyboard Navigation:** All interactive elements accessible via Tab key
- **Focus States:** Visible focus rings (2px solid #2563EB, offset 2px)
- **Alt Text:** All images and icons have descriptive alt text
- **ARIA Labels:** Buttons, links, and inputs have clear ARIA labels
- **Semantic HTML:** Use proper heading hierarchy (H1 → H2 → H3)

---

## Assets & Resources

### Images Needed
1. **Hero Screenshot:** Platform UI showing HTML doc + inline comments (1200x800px, @2x for retina)
2. **Product Screenshots:** Upload UI, share modal, comment thread, activity feed (800x600px each)
3. **Comparison Visual:** Google Docs broken formatting vs. Platform perfect formatting (side-by-side)
4. **Integration Logos:** Claude Code, Cursor, ChatGPT, Slack, Linear, Notion (SVG, grayscale)
5. **Testimonial Avatars:** User photos (circular, 64px @2x)
6. **Illustration Assets (optional):** Workflow diagram, abstract shapes for visual interest

### Icons
- Use **Heroicons** (https://heroicons.com/) or **Lucide** (https://lucide.dev/)
- Style: Outline (2px stroke) for consistency
- Size: 24px default, 32px for feature icons

### Logo
- **Wordmark + Icon** (for header)
- **Icon only** (for favicon, mobile)
- **White version** (for dark footer)
- Formats: SVG (preferred), PNG @2x for raster

---

## Design Deliverables

### Figma File Structure

**Pages:**
1. **Cover Page:** Design brief summary, brand colors, typography
2. **Design System:** Components library (buttons, cards, badges, inputs, typography scale)
3. **Desktop (1440px):** Full landing page design
4. **Tablet (768px):** Responsive layout
5. **Mobile (375px):** Mobile layout
6. **Component Specs:** Detailed specs for dev handoff (spacing, colors, states)

**Frames:**
- **Desktop:** 1440px width, auto-height
- **Tablet:** 768px width, auto-height
- **Mobile:** 375px width, auto-height

**Component Library:**
- Create reusable components for buttons, cards, badges, inputs
- Use Auto Layout for responsive components
- Define variants (Primary/Secondary, Hover/Active/Disabled states)

---

## Development Handoff Notes

### Tech Stack
- **Frontend:** React + Next.js (recommended)
- **CSS Framework:** Tailwind CSS (colors/spacing align with Tailwind defaults)
- **Animations:** Framer Motion for scroll animations
- **Forms:** React Hook Form + Zod validation
- **Analytics:** PostHog or Mixpanel for tracking CTA clicks

### CSS Classes (Tailwind Examples)
- **Hero Headline:** `text-5xl font-bold text-gray-900 leading-tight`
- **Primary Button:** `bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-lg shadow-sm`
- **Card:** `bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition`

### Performance
- **Images:** Use Next.js Image component for optimization
- **Lazy Loading:** Defer below-the-fold images/components
- **Font Loading:** Use `font-display: swap` for Inter font
- **Critical CSS:** Inline critical CSS for above-the-fold content

---

## Success Metrics (Post-Launch)

**Design Effectiveness:**
- **Bounce Rate:** <40% (industry standard: 41-55%)
- **Time on Page:** >2 minutes (indicates engagement)
- **CTA Click Rate:** >15% (primary CTA in hero)
- **Scroll Depth:** >70% reach pricing section

**Conversion Funnel:**
- **Landing Page → Signup:** Target 5-10%
- **Signup → First Document Upload:** Target 60%+
- **Free → Pro Conversion:** Target 3-5% (after 14 days)

---

## Inspiration & References

### SaaS Landing Pages (Best-in-Class)
- **Linear:** https://linear.app/ (clean, technical aesthetic)
- **Vercel:** https://vercel.com/ (gradients, modern, developer-focused)
- **Notion:** https://notion.so/ (clear value prop, beautiful product shots)
- **Figma:** https://figma.com/ (visual storytelling, feature highlights)
- **Cal.com:** https://cal.com/ (open-source, trustworthy, simple pricing)

### Design Principles
- **Clarity over cleverness:** Users should understand the value in 3 seconds
- **Whitespace is strategic:** Guide eye to CTAs and key messages
- **Trust signals early:** Security badges, testimonials, logos visible
- **Mobile-first:** 60%+ traffic will be mobile, ensure excellent mobile UX

---

## Next Steps

1. **Create Figma file** using this brief
2. **Design desktop version first** (1440px)
3. **Review with stakeholders** (PM, marketing, eng)
4. **Iterate based on feedback**
5. **Create tablet and mobile versions**
6. **Finalize component library**
7. **Prepare dev handoff** (export assets, specs, spacing)
8. **Conduct usability testing** (5-10 users, validate CTA clarity)

---

**Document Owner:** Design Team
**Reviewers:** Product, Marketing, Engineering
**Approval Required Before:** Dev handoff

---

**Questions or Feedback?** Contact [Design Lead] or leave comments in Figma.
