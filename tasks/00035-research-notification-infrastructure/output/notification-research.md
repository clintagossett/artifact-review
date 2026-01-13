# Research: Notification Infrastructure for Artifact Review

## Overview
Artifact Review requires a robust notification system to handle high-frequency events like comments, replies, and @mentions. The goal is to provide a premium user experience where users feel informed but not overwhelmed.

## Core Requirements
1. **In-App Notifications**: Real-time feedback within the application UI.
2. **Email Notifications**: Transactional emails for critical events.
3. **Aggregation (Digests)**: Grouping multiple events into a single notification to reduce noise.
4. **Preference Center**: Allowing users to opt-in/out of specific notification types and channels.
5. **The Arbitrator**: A logic layer that decides "who, what, when, and where" for every notification.

---

## 1. Notification Frameworks vs. Custom Build

### Modern Notification Platforms (Recommended)
These services act as a "Notification CMS" and handle the complexity of scheduling, batching, and template management.

| Platform | Strengths | Best For |
| :--- | :--- | :--- |
| **Knock** | Enterprise-grade, incredible DX, very powerful workflow engine for digests and delays. | Teams that want a "set and forget" powerful system. |
| **Novu** | Open-source, transparent, highly extensible, and has a great free tier. | Teams that prefer open-source or need high customization. |
| **Courier** | Great visual builder, support for hundreds of providers, powerful routing. | Products where non-developers (PMs/Designers) edit notification content. |
| **MagicBell** | Excellent pre-built Inbox UI, focus on "Smart Delivery" to reduce noise. | Speed to market for the in-app experience. |

### Custom Build (Convex + Resend)
- **Architecture**:
    - **In-App**: Use a `notifications` table in Convex. Use real-time queries to update an "Inbox" component.
    - **Email**: Trigger `Resend` calls from Convex Actions.
    - **Digests**: Use Convex Scheduled Functions (Crons) to aggregate rows in a `pendingNotifications` table every hour/day.
- **Pros**: Zero external cost (beyond Resend), full data sovereignty, synchronous with DB state.
- **Cons**: High development overhead for "Digests", "Retry Logic", and "Preference Center".

---

## 2. Aggregation & Digests: How they work

### The "Arbitrator" Logic
When an event occurs (e.g., `CommentCreated`), it should not send an email immediately. Instead, it hits the **Arbitrator**:
1. **Event Capture**: Mutation stores the event.
2. **Check Context**: Is the recipient currently active in the app? (If yes, maybe skip email).
3. **Check Frequency**: Has the recipient received an email in the last 15 minutes?
4. **Routing**:
    - Push to `notifications` table (Immediate).
    - If "Immediate Email" is triggered: Dispatch to Resend.
    - If "Digest" is preferred: Append to the "Current Active Digest" for that user.

### Example Digest Logic in Knock/Novu
These platforms use a **Digest Node** in their visual workflow:
- **Delay**: Wait for $X$ minutes/hours.
- **Aggregation Key**: Group by `artifactId`.
- **Completion**: Once the window closes, format a single email containing all captured events.

---

## 3. Specific Use Cases for Artifact Review

| Event | Priority | Channel | Type |
| :--- | :--- | :--- | :--- |
| **@Mention** | High | In-App + Email | Immediate |
| **Reply to my comment** | Medium | In-App + Email | Immediate or 15m Delay |
| **New Comment on Artifact**| Medium | In-App | Immediate |
| **New Comment on Artifact**| Low | Email | Daily Digest |
| **Comment Resolved** | Low | In-App | Immediate (optional) |
| **New Artifact Shared** | High | Email | Immediate |

---

## 4. Integration with Convex & Next.js

### Framework Integration Flow
1. **Trigger**: A Convex mutation `comments:create` finishes.
2. **Action**: It calls a Convex action `notifications:trigger`.
3. **Payload**: The action sends the event to Knock/Novu via their SDK.
4. **Processing**: The framework handles the digest window and preferences.
5. **Delivery**: Next.js frontend uses the framework's SDK (e.g., `@knocklabs/react`) to show the real-time inbox.

### Proposed Convex Schema (if building custom)
```typescript
// schema.ts
notifications: defineTable({
  recipientId: v.id("users"),
  actorId: v.id("users"),
  type: v.string(), // "mention", "reply", "comment"
  artifactId: v.id("artifacts"),
  commentId: v.optional(v.id("comments")),
  contentPreview: v.string(),
  isRead: v.boolean(),
  createdAt: v.number(),
}).index("by_recipient_unread", ["recipientId", "isRead"])

notificationPreferences: defineTable({
  userId: v.id("users"),
  emailMentions: v.boolean(),
  emailReplies: v.boolean(),
  dailyDigest: v.boolean(),
})
```

---

## 5. Recommendation

### Option A: The "Premium" Path (Knock)
Use **Knock**. It is the most robust solution for SaaS applications. It handles the "Arbitrator" logic (Workflows), "Aggregation" (Digests), and "Preferences" (built-in components). It integrates perfectly with Next.js.
- **Next Step**: Sign up for Knock, create a "New Comment" workflow with a 20-minute digest window.

### Option B: The "Integrated" Path (Convex Custom)
Build the **In-App Inbox** natively in Convex for maximum speed and real-time feel. Use **Resend** for immediate emails. Skip Digests for V1, or implement a simple daily cron job for "Activity Summaries".
- **Next Step**: Create the `notifications` table and an `Inbox` component in the navbar.

---

## Appendix: Libraries for Mentions
For the `@mention` feature itself (the UI part):
- **TipTap Mention Extension**: If using TipTap for the comment editor.
- **React-Mentions**: A simple, accessible library for textareas.
- **Tribute.js**: A vanilla JS library for @mentions.
