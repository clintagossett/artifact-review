# Pricing and Packaging Strategy

**Status:** Draft
**Last Updated:** December 24, 2024
**Version:** 1.0

This document memorializes pricing and packaging decisions for the Collaborative HTML Review Platform.

---

## Table of Contents

1. [Pricing Philosophy](#pricing-philosophy)
2. [Competitive Pricing Analysis](#competitive-pricing-analysis)
3. [Recommended Pricing Tiers](#recommended-pricing-tiers)
4. [Feature Packaging](#feature-packaging)
5. [Team & Enterprise Guidance](#team--enterprise-guidance)
6. [Pricing Psychology & Positioning](#pricing-psychology--positioning)
7. [Revenue Projections](#revenue-projections)
8. [Open Questions & Next Steps](#open-questions--next-steps)

---

## Pricing Philosophy

### Core Principles

1. **Creators Pay, Reviewers Don't**
   - Only document creators (uploaders) need paid plans
   - Reviewers can comment for free (unlimited)
   - Removes friction for stakeholder collaboration

2. **Value-Based Pricing**
   - Price anchored to time saved vs. manual conversion
   - Positioned as productivity tool, not commodity
   - Comparable to other PM/collaboration tools in stack

3. **Usage-Based Limits (Free Tier)**
   - Document count limits (not storage)
   - Version limits per document
   - Time-based review periods
   - Designed to encourage upgrade after proving value

4. **Freemium → Individual → Team**
   - Free tier for trial and light users
   - Individual plan for solo power users
   - Team plan for collaborative workflows

---

## Competitive Pricing Analysis

### Direct & Adjacent Competitors (2025)

| Product | Free Tier | Individual/Pro | Team/Business | Enterprise |
|---------|-----------|----------------|---------------|------------|
| **Notion** | Yes (unlimited pages) | $8/user/mo | $15/user/mo | Custom |
| **Figma** | Yes (3 files/team) | $12/editor/mo | $45/editor/mo | Custom |
| **Linear** | No | $8/user/mo | - | Custom |
| **Slack** | Yes (90 days history) | $7.25/user/mo | $15/user/mo | Custom |
| **Adobe Acrobat Teams** | Reader only | $15-20/user/mo | $24/user/mo | Custom |
| **Filestage** | Yes | $6/user/mo | $17.50/user/mo | Custom |
| **Dropbox Paper** | Yes | - | $12.50/user/mo | - |
| **Google Workspace** | Personal only | - | $12/user/mo | $18+/user/mo |

### Pricing Insights

**Sweet Spot for Collaboration Tools:**
- Free tier: Common (90%+ of competitors)
- Individual: $6-12/user/month
- Team: $12-20/user/month (most common: $15)
- Enterprise: Custom pricing

**Document/Review-Specific Tools:**
- Adobe Acrobat (PDF review): $15-24/user/month
- Filestage (video/doc review): $6-17.50/user/month
- Average: $10-15/user/month

**AI-Native Tools Premium:**
- Notion AI: +$8/mo on top of base plan
- Figma AI: Included in paid plans
- Trend: AI features justify $8-12 premium

---

## Recommended Pricing Tiers

### Tier 1: Free (Individual Use)

**Price:** $0

**Target User:** Individual PMs trying the platform, light users, reviewers

**Limits:**
- **3 documents** total (active)
- **3 versions** per document
- **7-day review period** per document (then read-only)
- **5 reviewers** per document
- Basic commenting (no advanced features)

**Included Features:**
- HTML upload and rendering
- Shareable links (public or private)
- Inline commenting (basic)
- Email notifications
- Mobile-responsive viewing

**Upgrade Triggers:**
- 4th document upload → Blocked, upgrade modal
- 4th version upload → Blocked, upgrade modal
- Day 6 of review period → Warning banner
- Day 7 of review period → Document becomes read-only

**Revenue Impact:** None (acquisition funnel)

---

### Tier 2: Pro (Individual Creator)

**Price:** **$12/month** (billed monthly) or **$10/month** (billed annually - save $24/year)

**Target User:** Individual PMs, designers, or knowledge workers who generate 5+ artifacts/month

**Limits Removed:**
- **Unlimited documents**
- **Unlimited versions** per document
- **Unlimited review period** (docs never expire)
- **Unlimited reviewers** per document

**Additional Features:**
- **Version history** with diff view
- **Advanced commenting:** Assign comments, mark resolved/unresolved, comment status
- **Custom branding:** Remove "Powered by [Platform]" footer
- **Priority support:** Email support with 24-hour response
- **Export:** Download HTML with comments as annotations
- **Analytics:** Basic view/comment stats per document

**Value Proposition:**
- "Save 2+ hours per week vs. manual Google Docs conversion" ($10/mo = $2.50/hr saved)
- "Professional sharing for stakeholders—no watermarks, no limits"

**Upgrade from Free:** Self-service checkout, instant activation

**Revenue Target:** 60% of paid users on this tier

---

### Tier 3: Team (Collaborative Workflow)

**Price:** **$18/user/month** (billed monthly) or **$15/user/month** (billed annually - save $36/user/year)

**Minimum:** 3 seats

**Target User:** Product teams, design teams, cross-functional teams with multiple creators

**Includes All Pro Features, Plus:**

**Team Collaboration:**
- **Shared team workspace:** All team members' docs in one place
- **Team folders:** Organize docs by project, initiative, or team
- **Reviewer assignment:** Assign specific reviewers to documents, track completion
- **Approval workflow:** Mark docs as "Draft," "In Review," "Approved"
- **Due dates:** Set review deadlines, automated reminders
- **Team activity feed:** See all team uploads, comments, approvals

**Admin & Control:**
- **Team admin dashboard:** Manage members, see usage, control permissions
- **Role-based access:** Admin, Creator, Reviewer roles
- **SSO (Single Sign-On):** Google Workspace, Microsoft, Okta integration
- **Audit logs:** Track all document actions (view, edit, comment, share)

**Integrations:**
- **Slack notifications:** New docs, comments, approvals posted to team channel
- **Linear/Jira integration:** Link docs to issues/tickets
- **MCP integration priority:** Early access to Claude Code MCP server

**Support:**
- **Priority support:** Email + live chat, 12-hour response SLA
- **Onboarding call:** 30-minute setup/training for teams 5+ seats

**Value Proposition:**
- "Replace scattered feedback (Slack + email + Docs) with one structured workflow"
- "Built for teams using AI tools—share Claude Code output in one click"

**Upgrade from Pro:** Contact sales or self-service (add seats)

**Revenue Target:** 35% of paid users on this tier

---

### Tier 4: Enterprise (Custom)

**Price:** Custom (starts ~$25-30/user/month, volume discounts)

**Minimum:** 25 seats (or custom for smaller orgs with enterprise needs)

**Target User:** Large product orgs (100+ PMs/designers), enterprises with compliance/security requirements

**Includes All Team Features, Plus:**

**Security & Compliance:**
- **SOC 2 Type II compliance:** Shareable audit reports
- **Advanced SSO:** SAML, custom identity providers
- **SCIM provisioning:** Automated user management
- **Data residency options:** Choose AWS region (US, EU, etc.)
- **Customer-managed encryption keys (CMEK):** Optional for highly regulated industries
- **Custom DPA (Data Processing Agreement):** GDPR, CCPA, HIPAA-ready templates
- **BAA (Business Associate Agreement):** For healthcare customers

**Advanced Features:**
- **Unlimited teams/workspaces:** Separate environments for different orgs/divisions
- **Custom retention policies:** Auto-archive docs after X days
- **Advanced analytics:** Usage dashboards, team performance, engagement metrics
- **API access:** Programmatic upload, comment retrieval, integrations
- **White-label option:** Custom domain (docs.yourcompany.com), full branding

**Support & Success:**
- **Dedicated success manager:** Quarterly business reviews, training
- **24/7 priority support:** Phone + email + live chat, 4-hour critical response SLA
- **Custom onboarding:** Multi-session training, admin certification
- **SLA guarantees:** 99.9% uptime, downtime credits

**Procurement:**
- **Custom contracts:** MSA, security questionnaires, vendor assessments
- **Flexible billing:** Annual prepay, monthly invoicing, PO support
- **Volume discounts:** Tiered pricing for 50+, 100+, 500+ seats

**Value Proposition:**
- "Enterprise-grade security for AI-native workflows"
- "Centralized control across hundreds of PMs and thousands of stakeholders"

**Sales Process:** Contact sales → Custom demo → Security review → Negotiation → Contract

**Revenue Target:** 5% of paid users, but 40%+ of revenue (due to seat count + higher ARPU)

---

## Feature Packaging Summary

### Feature Comparison Matrix

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| **Documents** | 3 | Unlimited | Unlimited | Unlimited |
| **Versions per doc** | 3 | Unlimited | Unlimited | Unlimited |
| **Review period** | 7 days | Unlimited | Unlimited | Unlimited |
| **Reviewers per doc** | 5 | Unlimited | Unlimited | Unlimited |
| **HTML upload & render** | ✓ | ✓ | ✓ | ✓ |
| **Shareable links** | ✓ | ✓ | ✓ | ✓ |
| **Inline commenting** | Basic | Advanced | Advanced | Advanced |
| **Version history** | ✗ | ✓ | ✓ | ✓ |
| **Custom branding** | ✗ | ✓ | ✓ | ✓ |
| **Export with comments** | ✗ | ✓ | ✓ | ✓ |
| **Analytics** | ✗ | Basic | Advanced | Custom |
| **Team workspace** | ✗ | ✗ | ✓ | ✓ |
| **Team folders** | ✗ | ✗ | ✓ | ✓ |
| **Approval workflow** | ✗ | ✗ | ✓ | ✓ |
| **Due dates & reminders** | ✗ | ✗ | ✓ | ✓ |
| **SSO** | ✗ | ✗ | Google/MS | SAML/Custom |
| **Audit logs** | ✗ | ✗ | 30 days | Unlimited |
| **Slack integration** | ✗ | ✗ | ✓ | ✓ |
| **MCP integration** | ✗ | Early access | Priority | Custom |
| **API access** | ✗ | ✗ | ✗ | ✓ |
| **Support** | Community | Email (24h) | Email+Chat (12h) | 24/7 (4h) |
| **SOC 2 compliance** | ✗ | ✗ | ✗ | ✓ |
| **Custom contracts** | ✗ | ✗ | ✗ | ✓ |

---

## Team & Enterprise Guidance

### Team Plan Details

**Minimum Seats:** 3 users

**Why 3-seat minimum?**
- Encourages team adoption (not just individual upgrade)
- Standard in SaaS (Notion, Slack, Figma all have minimums)
- Ensures collaboration features get used

**Seat Management:**
- Admins can add/remove seats anytime
- Pro-rated billing for mid-month changes
- Unused seats can be reassigned

**Roles:**
- **Admin:** Manage team, billing, members, settings
- **Creator:** Upload docs, invite reviewers, manage own docs
- **Reviewer:** Comment only (free, doesn't count toward seat limit)

**Team Size Sweet Spot:**
- 5-15 seats: Self-service online checkout
- 15-25 seats: Optional sales-assisted onboarding call
- 25+ seats: Enterprise conversation

---

### Enterprise Plan Details

**When to Offer Enterprise:**

Trigger 1: Customer asks for:
- SOC 2 compliance report
- Custom contract/MSA
- SAML SSO beyond Google/Microsoft
- Data residency requirements
- BAA or DPA

Trigger 2: Deal size:
- 25+ seats (automatic enterprise consideration)
- 50+ seats (require enterprise plan)

Trigger 3: Sales cycle signals:
- Multiple stakeholders (IT, Legal, Procurement, PM team)
- Security questionnaire sent
- Request for vendor assessment

**Enterprise Sales Process:**

1. **Initial Contact:** Inbound demo request or outbound to large orgs
2. **Discovery Call:** Understand needs, team size, security requirements, budget
3. **Custom Demo:** Tailored to their use case, show enterprise features
4. **Security Review:** Share SOC 2, answer questionnaire, provide docs
5. **Proof of Value (POV):** 30-day trial with 5-10 users, measure usage
6. **Negotiation:** Custom pricing, contract terms, SLA commitments
7. **Legal Review:** MSA, DPA, security addendums
8. **Signature:** Contract signed, PO issued
9. **Onboarding:** Dedicated success manager, multi-week rollout

**Enterprise Timeline:** 60-120 days from initial contact to signature

**Enterprise Pricing Flexibility:**

- Volume discounts: 10% off for 100+ seats, 20% off for 500+ seats
- Annual prepay discount: 15-20% off for upfront payment
- Multi-year contracts: Additional 5-10% off for 2-3 year commitments

**Example Enterprise Pricing:**

| Seats | Monthly Price/User | Annual Price/User | Total Annual |
|-------|-------------------|-------------------|--------------|
| 25 | $30 | $25 | $7,500 |
| 50 | $28 | $23 | $13,800 |
| 100 | $25 | $20 | $24,000 |
| 250 | $23 | $18 | $54,000 |
| 500+ | Custom | Custom | $90,000+ |

---

## Pricing Psychology & Positioning

### Anchoring

**Primary Anchor:** "Save 2-3 hours per week vs. manual Google Docs conversion"
- 2 hours/week × $50/hr (PM hourly rate) = $100/week = $400/month value
- $12/month Pro plan = 97% savings on time value

**Secondary Anchor:** "Comparable to other PM tools you already use"
- Linear: $8/user
- Notion: $8-15/user
- Figma: $12/editor
- Our pricing fits naturally in their existing stack

### Value Metrics

**For Individual PMs (Pro Plan):**
- Time saved: 2-3 hours/week
- Professional presentation: No more broken formatting
- Faster feedback cycles: Same-day reviews vs. 2-3 day email loops

**For Teams (Team Plan):**
- Centralized feedback: Replace Slack + email + Google Docs scatter
- Workflow efficiency: Structured approval process
- Team visibility: Know who's reviewed what, what's pending

**For Enterprises (Enterprise Plan):**
- Security & compliance: SOC 2 ready for vendor assessments
- Centralized control: Admin oversight across hundreds of users
- Brand consistency: White-label, custom domain

### Objection Handling

**"Why not just use Google Docs?"**
- "Google Docs breaks HTML formatting—you spend 30 mins reformatting every time. We preserve it perfectly."
- "Google Docs requires everyone to have Google accounts. We let stakeholders comment without signing up."

**"Why not just use Notion?"**
- "Notion requires everyone in your ecosystem. We're lightweight—upload, review, done."
- "Notion can't import external AI output (Claude Code HTML) cleanly. We're built for that."

**"This seems expensive for document sharing."**
- "You're not paying for storage—you're paying to save 2+ hours/week of manual work."
- "Compare to Adobe Acrobat ($15-24/user) or Figma ($12/editor)—we're priced similarly for professional tools."

**"We already pay for too many tools."**
- "We replace 3 workflows: conversion, sharing, feedback collection. Net reduction in tool chaos."
- "Free tier lets you try risk-free. Upgrade only when you're saving time."

---

## Revenue Projections

### Assumptions

**Year 1 (MVP Launch):**
- 500 total signups
- 60% Free, 30% Pro, 10% Team
- Pro: 150 users × $10/mo (annual) = $1,500/mo = $18,000 ARR
- Team: 50 users × $15/mo (annual) = $750/mo = $9,000 ARR
- **Total Y1 ARR:** $27,000

**Year 2 (Growth):**
- 5,000 total signups
- 50% Free, 35% Pro, 13% Team, 2% Enterprise
- Pro: 1,750 users × $10/mo = $17,500/mo = $210,000 ARR
- Team: 650 users × $15/mo = $9,750/mo = $117,000 ARR
- Enterprise: 100 users × $25/mo = $2,500/mo = $30,000 ARR
- **Total Y2 ARR:** $357,000

**Year 3 (Scale):**
- 20,000 total signups
- 40% Free, 35% Pro, 20% Team, 5% Enterprise
- Pro: 7,000 users × $10/mo = $70,000/mo = $840,000 ARR
- Team: 4,000 users × $15/mo = $60,000/mo = $720,000 ARR
- Enterprise: 1,000 users × $25/mo = $25,000/mo = $300,000 ARR
- **Total Y3 ARR:** $1,860,000

### Path to $1M ARR

**Milestone:** 5,556 paid users (mix of Pro/Team/Enterprise)

**Breakdown Example:**
- 3,000 Pro users @ $10/mo = $360,000 ARR
- 2,000 Team users @ $15/mo = $360,000 ARR
- 556 Enterprise users @ $25/mo = $167,000 ARR
- **Total:** $887,000 ARR (close to $1M)

**Timeline:** 18-24 months from launch (achievable with land-and-expand motion)

---

## Open Questions & Next Steps

### Pricing Questions to Validate

1. **Is $12/mo too high for individual PMs?**
   - Test: A/B test $10 vs. $12 vs. $15 during beta
   - Benchmark: Notion ($8), Figma ($12), Linear ($8)
   - **Decision pending:** Start at $12, adjust based on conversion data

2. **Should Free tier be 3 docs or 5 docs?**
   - 3 docs: Faster conversion to paid
   - 5 docs: More time to prove value
   - **Decision pending:** Start with 3, monitor churn

3. **Should we offer a "Startup" plan between Pro and Team?**
   - E.g., $8/user for early-stage startups (2-5 seats)
   - **Decision pending:** No, keep tiers simple initially

4. **Annual discount: 17% (2 months free) or 20% (2.4 months free)?**
   - Notion: ~17%
   - Slack: ~17%
   - Industry standard: 15-20%
   - **Decision pending:** Start with 17%, test 20% in promos

5. **MCP integration: Paid feature or free for all?**
   - Option A: Free for all (drives adoption)
   - Option B: Pro+ only (premium feature)
   - **Decision pending:** Free for Pro+ (encourages paid conversions)

### Packaging Questions to Validate

1. **Should "Advanced commenting" be Pro or Team?**
   - Current: Pro gets assign/resolve comments
   - Alternative: Basic comments on Pro, advanced on Team
   - **Decision pending:** Pro gets advanced (individual power users need this)

2. **Should analytics be Pro (basic) or Team-only?**
   - Current: Pro gets basic (view counts), Team gets advanced (engagement metrics)
   - Alternative: Team-only (analytics = team feature)
   - **Decision pending:** Pro gets basic (validates individual value)

3. **Export with comments: Pro or Team?**
   - Current: Pro gets export
   - Alternative: Team-only (collaboration = export)
   - **Decision pending:** Pro gets export (individual creators need this for handoff)

### Next Steps (Pricing Launch Readiness)

**Before MVP Launch:**

- [ ] **Finalize pricing** (confirm $12 Pro, $18 Team, or adjust based on beta feedback)
- [ ] **Build pricing page** (comparison table, clear CTAs, testimonials)
- [ ] **Set up billing** (Stripe integration, seat management, pro-rating)
- [ ] **Create upgrade modals** (limit-hit triggers, compelling copy)
- [ ] **Write pricing FAQ** (objection handling, feature questions)

**During Beta (Month 1-2):**

- [ ] **Test conversion rates** (Free → Pro, Pro → Team)
- [ ] **Collect pricing feedback** (exit surveys, user interviews)
- [ ] **Monitor churn** (are limits too restrictive? Too generous?)
- [ ] **A/B test pricing** (if conversion <5%, test $10 Pro)

**Post-Launch (Month 3-6):**

- [ ] **Introduce annual billing** (17% discount, 2 months free)
- [ ] **Launch Team plan** (once 20+ Pro users exist)
- [ ] **Develop Enterprise motion** (first 25+ seat opportunity)
- [ ] **Iterate packaging** (move features between tiers based on usage data)

---

## Decision Log

| Decision | Date | Status | Notes |
|----------|------|--------|-------|
| Pro plan: $12/mo (monthly), $10/mo (annual) | 2024-12-24 | **Proposed** | Aligns with Figma ($12), between Notion ($8) and Adobe ($15-20) |
| Team plan: $18/mo (monthly), $15/mo (annual) | 2024-12-24 | **Proposed** | Matches Slack Business+ ($15), Notion Business ($15) |
| Free tier: 3 docs, 3 versions, 7-day review | 2024-12-24 | **Proposed** | Generous enough to prove value, restrictive enough to drive upgrades |
| Reviewers always free | 2024-12-24 | **Accepted** | Critical for viral growth and stakeholder access |
| Team minimum: 3 seats | 2024-12-24 | **Proposed** | Industry standard, encourages team adoption |
| MCP integration: Pro+ feature | 2024-12-24 | **Proposed** | Drives Pro conversions, differentiates from Free |
| Enterprise minimum: 25 seats | 2024-12-24 | **Proposed** | Ensures sales-assisted process for complex deals |

---

## References

### Competitive Pricing Sources (2025)

- [Notion Pricing Plans](https://www.notion.com/pricing)
- [Notion's SaaS Pricing Strategy](https://www.getmonetizely.com/articles/notions-saas-pricing-strategy-a-blueprint-for-productivity-tool-success)
- [Figma Pricing Tiers & Costs](https://cpoclub.com/tools/figma-pricing/)
- [Inside Figma's SaaS Design Tool Pricing Model](https://www.getmonetizely.com/articles/inside-figmas-saas-design-tool-pricing-model-a-masterclass-in-value-based-strategy)
- [Slack Pricing Guide 2025](https://www.cloudeagle.ai/blogs/slack-pricing-guide)
- [Slack Pricing Plans](https://slack.com/pricing)
- [Adobe Acrobat Pricing 2025](https://www.softwareadvice.com/content-collaboration/adobe-acrobat-dc-profile/)
- [Adobe Acrobat Software Pricing & Plans](https://www.vendr.com/marketplace/adobe-acrobat)
- [10 Best Document Collaboration Software & Tools in 2025](https://www.proprofskb.com/blog/best-document-collaboration-tools/)
- [24 Best Document Collaboration Tools Review 2025](https://thedigitalprojectmanager.com/tools/document-collaboration-tools/)

### Internal References

- [PRODUCT-DISCOVERY.md](../../PRODUCT-DISCOVERY.md) - Initial pricing research
- [market-overview.md](../market-intelligence/market-overview.md) - TAM/SAM/SOM analysis
- [competitors.md](../market-intelligence/competitors.md) - Competitive landscape

---

**Document Owner:** Product Team
**Reviewers:** Finance, Sales, Marketing
**Next Review:** After beta launch (Q1 2025)
