# Task 00114: Document Legal Policies (Terms of Service & Privacy Policy)

**GitHub Issue:** #128
**Related Project:** Legal Documentation

---

## Resume (Start Here)

**Last Updated:** 2026-02-17

### Current Status: DONE

**Phase:** Comprehensive Legal Documentation

### Next Steps

- Legal review by a qualified attorney before publishing
- Register DMCA agent with U.S. Copyright Office ($6 fee)
- Finalize company mailing address for legal documents
- Implement as web pages when ready to publish publicly

---

## Objective

Create comprehensive legal documentation for Artifact Review, covering Terms of Service, Privacy Policy, and supplementary policies required for a SaaS platform handling AI-generated content.

---

## Context & Approach

### 1. Source Selection

We used **three open-source policy template repositories** as foundations:

| Source | License | Primary Use |
|--------|---------|-------------|
| [Basecamp Policies](https://github.com/basecamp/policies) | CC BY 4.0 | Tone, readability, core structure |
| [GitHub Site Policy](https://github.com/github/site-policy) | CC0 1.0 (public domain) | AUP structure, DMCA process, AI content policy |
| [Automattic/Legalmattic](https://github.com/Automattic/legalmattic) | CC BY-SA 4.0 | GDPR/cookie/data transfer sections |

### 2. Research Conducted

Before drafting, we performed comprehensive research on:
- Open-source legal policy templates (Basecamp, GitHub, Automattic, and others)
- SaaS Terms of Service best practices and essential sections
- GDPR compliance requirements (lawful basis, data subject rights, international transfers)
- CCPA/CPRA compliance requirements (California-specific disclosures)
- Cookie policy requirements (consent mechanisms, categories)
- DMCA compliance for platforms hosting user-generated content
- AI-specific legal considerations (ownership, copyright status, no-training commitments)
- Third-party processor disclosure requirements (Stripe, Clerk, Convex, Novu, Vercel)

### 3. Adaptation Logic

For each source template, we applied:
- **Identity replacement:** "37signals"/"Basecamp"/"Automattic" → "Artifact Review"
- **Contact information:** Replaced with `privacy@artifactreview.com`, `support@artifactreview.com`, `abuse@artifactreview.com`, `dmca@artifactreview.com`
- **Product specifics:** Removed clauses specific to other products; added Artifact Review-specific language for AI artifacts, HTML content, review workflows
- **Third-party services:** Added complete subprocessor disclosure table (Stripe, Clerk, Convex, Novu, Vercel)
- **AI-specific terms:** Added entirely new sections for AI-generated content (ownership, copyright limitations, no-training commitment, accuracy disclaimers, embedded code risks)
- **Legal additions:** Added indemnification, dispute resolution/arbitration with opt-out, governing law (Delaware), liability cap, age requirements

### 4. Implementation

All documents saved as internal documentation in `docs/legal/`. Not yet implemented as web pages — ready for legal review first.

---

## Documents Created

| Document | Path | Source Templates | Key Sections |
|----------|------|-----------------|--------------|
| **Privacy Policy** | `docs/legal/privacy-policy.md` | Basecamp + Automattic + GitHub | Data collection, GDPR lawful basis, subprocessor table, cookie section, data breach notification, international transfers, children's privacy, data retention periods |
| **Terms of Service** | `docs/legal/terms-of-service.md` | Basecamp + GitHub | AI-generated content terms, user-generated content license, indemnification, dispute resolution/arbitration, governing law, liability cap, data export, eligibility |
| **Acceptable Use Policy** | `docs/legal/acceptable-use-policy.md` | Basecamp + GitHub | Content restrictions, security/platform integrity, AI-specific restrictions, zero-tolerance activities, abuse reporting |
| **CCPA Notice** | `docs/legal/ccpa-notice.md` | Basecamp | California data categories table, CCPA rights, exercise instructions, Shine the Light disclosure |
| **DMCA Policy** | `docs/legal/dmca-policy.md` | Basecamp + GitHub | Takedown notice requirements, counter-notification process, repeat infringer policy, DMCA agent registration |
| **Cookie Policy** | `docs/legal/cookie-policy.md` | Automattic | Essential/analytics/third-party cookie categories, specific cookie table, consent mechanism, browser management instructions |

---

## Changes Made (vs. Prior Agent's Work)

The prior agent created basic Privacy Policy and Terms of Service adapted from Basecamp only. This iteration:

1. **Expanded Privacy Policy** from ~70 lines to ~260 lines with 14 major sections
2. **Expanded Terms of Service** from ~55 lines to ~230 lines with 20 major sections
3. **Created 4 new documents** (AUP, CCPA, DMCA, Cookie Policy)
4. **Added AI-specific terms** (entirely new — not in any source template)
5. **Added subprocessor disclosure table** with all 5 third-party services
6. **Added GDPR compliance** (lawful basis, expanded rights, international transfers, DPF/SCCs)
7. **Added dispute resolution** (arbitration with 30-day opt-out, class action waiver)
8. **Added liability cap** (12 months of fees or $100)
9. **Added data breach notification** procedures
10. **Added children's privacy** section (minimum age 16)

## Output

- [Privacy Policy](../../docs/legal/privacy-policy.md)
- [Terms of Service](../../docs/legal/terms-of-service.md)
- [Acceptable Use Policy](../../docs/legal/acceptable-use-policy.md)
- [CCPA Notice](../../docs/legal/ccpa-notice.md)
- [DMCA Policy](../../docs/legal/dmca-policy.md)
- [Cookie Policy](../../docs/legal/cookie-policy.md)
