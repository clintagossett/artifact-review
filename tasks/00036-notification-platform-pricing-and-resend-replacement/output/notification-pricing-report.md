# Research Report: Notification Platforms Pricing & Infrastructure

## Executive Summary
Notification platforms (Knock, Novu, Courier, MagicBell) **do not replace** email sending services like Resend. They act as an **orchestration layer** that sits on top of them. You will still need Resend (or SendGrid/Postmark) for the actual delivery of emails.

## 1. The "Wrapped" Architecture
When you use a notification platform, the flow looks like this:
1. **Trigger**: Your app (Convex) sends an event to the Framework (e.g., Knock).
2. **Logic**: The Framework decides if an email should be sent (Batching/Digests/Preferences).
3. **Delivery**: The Framework calls the API of your **Delivery Provider** (e.g., Resend) to send the mail.

**Conclusion**: These platforms are a *cost addition*, not a replacement for your email infrastructure.

---

## 2. Pricing Breakdown (The "SaaS Tax" Audit)

| Platform | Free Tier | Paid Start | "The Trap" |
| :--- | :--- | :--- | :--- |
| **Knock** | 10k messages/mo | **$250/mo** | High floor. Great for enterprise, heavy for startups. |
| **Novu (Cloud)** | 10k events/mo | **$30/mo** | Most affordable paid tier ($30 for 30k events). |
| **Courier** | 10k messages/mo | Usage based | No flat monthly fee at the start; pay-as-you-go ($0.005/msg). |
| **MagicBell** | 1k deliveries/mo | **$249/mo** | Smallest free tier for emails. |

---

## 3. Build vs. Buy: The Cost-Effectiveness Matrix

### Scenario A: Build Native (Convex + Resend)
- **Cost**: $0 (until 3k emails/mo, then $20/mo for Resend).
- **Pros**: Complete control, zero "framework tax", internal data stays in Convex.
- **Cons**: You have to write the "Digest" logic (crons) and the "Preference Center" (UI) yourself.

### Scenario B: Framework (Novu/Courier)
- **Cost**: $0 (until 10k messages).
- **Pros**: Complex logic like "Wait 2 hours and group all comments into 1 email" is a toggle.
- **Cons**: Yet another external dependency. If you scale, the $30-$250/mo bill hits eventually.

---

## 4. Final Recommendation for Artifact Review

### Recommendation: "Start Lean, Use a Wrapper"
1. **Don't replace Resend**. It's the best delivery service for React-based emails.
2. **Use Novu or Courier** (Cloud Free Tiers).
    - **Why Novu?** It has a **$30/mo** starter tier. If you outgrow the free 10k, $30 is much easier to swallow than $250.
    - **Why Courier?** They don't have a high monthly floor; it's pure usage.
3. **Avoid Knock/MagicBell** for now. Their $250/mo entry price is too steep for an early-stage project unless you specifically need their Enterprise features (SSO, HIPAA).

### Immediate Next Steps
- Sign up for **Novu** (Cloud).
- Connect your existing **Resend API Key** to Novu.
- Route your first notification (e.g., "New Comment") through Novu instead of direct Resend calls.
