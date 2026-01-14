# Strategic Plan: Novu Integration & Journey Enrichment

## 1. Multi-Environment Integration Strategy
We will manage three distinct environments to ensure development doesn't interfere with actual user notifications.

| Environment | Mode | Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **Local** | **Bridge Mode** | `npx novu dev` | Local developer testing. Uses a tunnel to your machine. |
| **Development** | **Novu "Dev" Env** | `NODE_ENV=development` | Integration testing for our hosted Dev site. |
| **Production** | **Novu "Prod" Env** | `NODE_ENV=production` | Live user notifications. |

### Environment Setup Flow
1. **Local**: One developer runs the Novu Bridge. Workflows are defined in code.
2. **Syncing**: We use the Novu CLI to "push" workflow definitions from code to the Novu Cloud (Dev environment first).
3. **API Keys**: We will store 3 sets of Novu API Keys in our environment variables (via Convex and Vercel).

---

## 2. Journey Enrichment Matrix
Mapping every "Notification Moment" across our existing user journeys.

| Journey | Event | Notification Type | Channel | Logic |
| :--- | :--- | :--- | :--- | :--- |
| **003 Reviewer Feedback** | New Comment Created | Activity Feed Item | In-App | Immediate |
| **003 Reviewer Feedback** | Reply to my comment | Mention/Reply Item | In-App + Email | Digest (20m window) |
| **003 Reviewer Feedback** | Comment Marked Resolved | Status Update | In-App | Immediate |
| **004 Sharing & Invites** | User Invited to Artifact | Invite Item | Email | Immediate |
| **004 Sharing & Invites** | User Accepts Invite | Access Granted | In-App (Owner) | Immediate |
| **005 Plan & Limits** | Approaching Limit (80%) | Warning | In-App + Slack | Immediate |
| **005 Plan & Limits** | Payment Failed | Critical Alert | Email | Immediate |
| **008 Team Onboarding** | New Member Joined | Team Update | Slack | Immediate |
| **011 Agent Workflows** | Artifact Analysis Done | Task Complete | In-App + Slack | Immediate |

---

## 3. Product Enhancement Features

### A. The "Smart" Slack Integration (OPTIONAL)
- **Concept**: A "Connect to Slack" button in the Team Settings.
- **Function**: Artifact Review will post "Review Summaries" to a specific Slack channel.
- **Novu Role**: Novu handles the Slack OAuth and message formatting using their Slack provider.
- **Note**: Slack is always an **optional** opt-in feature for teams.

### B. The "Inbox" Bell (MANDATORY)
- **Concept**: A notification bell in the top-right navbar.
- **Novu Role**: Use the `@novu/notification-center` React component to show a real-time feed of comments and invites.
- **Requirement**: Part of the core product experience.

### C. Smart Digests (MANDATORY)
- **Concept**: If a user is actively commenting on a doc, don't spam their email.
- **Novu Role**: Use the **Digest Node**. It will wait for a period of inactivity (e.g., 15 mins) before sending one summary email of all comments.
- **Requirement**: Default email behavior to ensure a premium experience.

---

## 4. Implementation Phasing (Starting with FREE)

### Phase 1: Local Foundation (Free)
- Set up Novu Bridge in the `/app` directory.
- Implement the "In-App Inbox" component in the header.
- Trigger an in-app notification when a comment is created.

### Phase 2: Email & Dev Sync (Free)
- Connect our **Resend** key to the Novu Dev environment.
- implement "Invite" emails via Novu workflows (moving logic out of `access.ts`).
- Set up the Novu tunnel for our hosted Dev environment.

### Phase 3: Slack & Digests (Free/Paid)
- Enable the Slack provider in Novu.
- Add the "Digest" node to comment notifications to prevent spam.
- **Decision Point**: At this stage, we monitor volume to see if we hit the 10k free event limit.

---

## 5. Next steps for the Developer
1. **Register** at Novu.co.
2. **Install** the Novu Framework SDK in our Next.js app.
3. **Expose** a `/api/novu` route to act as the Bridge.
