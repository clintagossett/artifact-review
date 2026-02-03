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

| Platform | Free Tier | Paid Start | "The Trap" | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Novu** | 10k events/mo | **$30/mo** | Very low. $30 for 30k events. | **Product-led startups** |
| **Courier** | 10k messages/mo | Usage based | Scaling. $0.005/msg adds up. | **Enterprise / PM-heavy teams** |
| **Knock** | 10k messages/mo | **$250/mo** | High floor. | **Growth-stage companies** |
| **MagicBell** | 1k deliveries/mo | **$249/mo** | Smallest free tier. | **Simple In-App Feed only** |

---

## 3. Novu vs. Courier: Product Deep Dive (2024-2025)

### Novu: The "Developer-First" Engine
Novu is an **Open-Core** platform. It focuses heavily on the DX (Developer Experience) and providing a unified API that you can either use in their cloud or self-host.
-   **Slack Integration**: Excellent. You can trigger messages to Slack channels easily.
-   **Mental Model**: It feels like a headless CMS for notifications. You define workflows in code or their dashboard, and you "trigger" them with a simple API call.
-   **Pros**: MIT-licensed (no lock-in), $30/mo starter tier is the best value in the market, very fast to integrate with React (Next.js).
-   **Cons**: Their dashboard is slightly less "shiny" for non-technical users compared to Courier.

### Courier: The "Omnichannel Workflow" Designer
Courier is a **SaaS-only** orchestration platform. It is designed to be usable by both Developers and Product Managers.
-   **Slack Integration**: Best-in-class. Supports Slack, Teams, Discord, and WhatsApp with deep provider-specific features.
-   **Mental Model**: A visual "canvas" where you drag and drop logic (e.g., "If user hasn't clicked email, send Slack message").
-   **Pros**: No flat monthly fee at the start (100% usage-based), massive library of 50+ integrations, powerful throttling/bulk send.
-   **Cons**: SaaS-only (full vendor lock-in), "Pay-as-you-go" can become less predictable than Novu's $30/mo tier as you scale.

---

## 4. Slack Notifications: The "Smart Idea"
Both platforms support Slack integration, but they approach it differently:
-   **User-Level Integration**: Both allow you to map a `subscriberId` to a Slack `channelId` or `webhook`.
-   **Interactive Messages**: Both support Slack "Blocks", meaning your notifications can have buttons (e.g., "Resolve Comment" directly from Slack).
-   **Artifact Review Use-Case**: This is perfect for your app. Users could connect their team's Slack, and every time a new artifact version is uploaded or a comment is made, a rich message with a deep link hits their channel.

---

## 5. Build vs. Buy: The Cost-Effectiveness Matrix

### Scenario A: Build Native (Convex + Resend)
- **Cost**: $0 (until 3k emails/mo, then $20/mo for Resend).
- **Pros**: Complete control, zero "framework tax", internal data stays in Convex.
- **Cons**: You have to write the "Digest" logic (crons) and the "Preference Center" (UI) yourself.

### Scenario B: Framework (Novu/Courier)
- **Cost**: $0 (until 10k messages).
- **Pros**: Complex logic like "Wait 2 hours and group all comments into 1 email" is a toggle.
- **Cons**: Yet another external dependency. If you scale, the $30-$250/mo bill hits eventually.

---

## 6. Final Recommendation for Artifact Review

### Recommendation: "Start with Novu"
1.  **Slack Integration**: Native support for interactive Slack blocks.
2.  **Predictable Cost**: The **$30/mo** tier is safer for a growing startup than variable usage or $250/mo floors.
3.  **No Lock-in**: If you ever want to save even more money, you can move Novu to your own infrastructure because it's open-source.
4.  **Resend Synergy**: Novu has a dedicated Resend integration that takes 30 seconds to set up.

### Immediate Next Steps
-   Sign up for **Novu** (Cloud).
-   Connect **Resend** as the Email provider.
-   Create a "Slack Integration" workflow to test the "Smart Idea" of team-wide notifications.

