# Task 00009: Email Design and Format Standards

**GitHub Issue:** [#9](https://github.com/clintagossett/artifact-review/issues/9)

---

## Resume (Start Here)

**Last Updated:** 2025-12-26 (Session 1)

### Current Status: OPEN

**Phase:** Task created, ready for research and standards definition.

### What We Did This Session (Session 1)

1. **Created task** - Set up task folder and GitHub issue

### Next Steps

1. **Research email client compatibility** - Document rendering differences across major email clients (Gmail, Outlook, Apple Mail, etc.)
2. **Define HTML/CSS standards** - Establish safe HTML elements and CSS properties for cross-client compatibility
3. **Create responsive design guidelines** - Mobile-first email design requirements
4. **Establish accessibility standards** - Screen reader compatibility, color contrast, alt text requirements
5. **Define deliverability best practices** - SPF/DKIM/DMARC, content guidelines to avoid spam filters
6. **Create template standards** - Reusable component patterns and brand consistency

---

## Objective

Define comprehensive email design and format standards to ensure optimal deliverability and user experience across all platform emails.

---

## Scope

### Design Standards
- Layout and structure guidelines
- Typography and font stacks (email-safe fonts)
- Color usage and accessibility
- Image handling and optimization
- Button and CTA design
- Spacing and padding conventions

### Technical Standards
- HTML structure (tables vs. div-based layouts)
- Inline CSS requirements
- Media query support and fallbacks
- Maximum email width
- Image hosting and caching
- Plain text version requirements

### Deliverability Standards
- Authentication (SPF, DKIM, DMARC)
- Content best practices
- List hygiene requirements
- Unsubscribe handling
- Bounce management

### Testing Requirements
- Email client test matrix
- Preview and testing tools
- Accessibility testing
- Spam score checking

---

## Current Email Usage

From Task 8 (Magic Link Authentication):
- Magic link emails via Resend
- React Email templates
- Current template: `emails/magic-link.tsx`

---

## Deliverables

1. **Email Design Standards Document** - `docs/design/email-standards.md`
2. **Email Testing Checklist** - QA checklist for all emails
3. **Template Component Library** - Reusable React Email components
4. **Client Compatibility Matrix** - What works where

---

## Email Types to Consider

| Email Type | Priority | Status |
|------------|----------|--------|
| Magic Link (Auth) | High | Exists |
| Welcome Email | Medium | Planned |
| Password Reset | Medium | Planned |
| Notification Emails | Medium | Future |
| Transactional | Low | Future |

---

## Research Areas

### Email Client Market Share
- Gmail (web & mobile)
- Apple Mail (iOS & macOS)
- Outlook (desktop, web, mobile)
- Yahoo Mail
- Other clients

### Known Limitations
- Outlook's Word rendering engine
- Gmail's CSS stripping
- Dark mode variations
- Image blocking defaults

---

## Output

_(To be created)_
- `docs/design/email-standards.md`
- Updated `emails/` component library

## Testing

- Litmus or Email on Acid for cross-client testing
- Manual testing on primary clients
- Accessibility audit tools
