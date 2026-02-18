# Human TODO - Legal Policies

These items require human action and cannot be completed by an agent.

## Before Publishing

- [ ] **Attorney review** — Have a qualified attorney review all 6 documents in `docs/legal/` before publishing publicly
- [ ] **Register DMCA agent** — File with the U.S. Copyright Office ($6 fee) at https://www.copyright.gov/dmca-directory/ and update `docs/legal/dmca-policy.md` with the registered agent address
  - **What is a DMCA agent?** A person or role designated by your company to receive copyright takedown notices under the DMCA. The law requires any service hosting user-uploaded content to register one. Without it, you don't qualify for DMCA "safe harbor" protection — meaning you could be held directly liable for infringing content users upload. With it registered, as long as you respond to valid takedown notices promptly, you're protected. The agent doesn't have to be a lawyer — it can be anyone at the company (a founder, employee, or a general "Legal Team" email). The registration just tells copyright holders who to contact.
- [ ] **Finalize company mailing address** — Update the DMCA policy and any other documents that reference a physical address
- [ ] **Verify subprocessor privacy policy URLs** — Confirm that the linked privacy policies for Stripe, Clerk, Convex, Novu, and Vercel in the Privacy Policy are current and correct
- [ ] **Set up email addresses** — Ensure the following addresses are configured and monitored:
  - `privacy@artifactreview.com`
  - `support@artifactreview.com`
  - `abuse@artifactreview.com`
  - `dmca@artifactreview.com`
  - `legal@artifactreview.com`
- [ ] **Decide on governing law jurisdiction** — Currently set to Delaware. Confirm this is correct for the business entity.
- [ ] **Confirm minimum age** — Currently set to 16 (GDPR-aligned). If only targeting US users, could be 13 (COPPA). Attorney should advise.

## When Publishing as Web Pages

- [ ] **Implement cookie consent banner** — Required for GDPR compliance before setting non-essential cookies
- [ ] **Add "Do Not Sell" link** — CCPA requires this in the footer (even though we don't sell data, the link should exist)
- [ ] **Add acceptance checkbox** — ToS acceptance during signup (not just "by using the service you agree")
- [ ] **Implement data export** — The ToS references data export functionality in account settings
- [ ] **Set up arbitration opt-out tracking** — Need a system to record users who opt out within 30 days
