# Subtask 02: Novu Workflow Configuration

## Objective

Set up and configure the Novu workflow(s) that handle comment and reply notifications. Ensure in-app notifications appear in the bell icon and email digests are properly batched.

## Context

Currently:
- `convex/novu.ts` triggers a workflow named `"new-comment"` with payload data
- The workflow must exist in Novu's dashboard or be defined via Novu Framework
- Both in-app and email channels need to be configured

## Technical Approach

### Novu Workflow Types

1. **In-App Notifications** (immediate)
   - Appear in the bell icon notification center
   - Real-time via Novu's WebSocket connection

2. **Email Notifications** (digested)
   - Batched using Novu's Digest node
   - Interval controlled by `NOVU_DIGEST_INTERVAL` (default: 10 min)

### Workflow Structure

```
Trigger: "new-comment"
  └── In-App Step (immediate)
  └── Digest Node (wait NOVU_DIGEST_INTERVAL)
       └── Email Step (batched summary)
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/src/lib/novu/workflows/new-comment.ts` | Create | Define workflow using Novu Framework |
| `app/src/app/api/novu/route.ts` | Create | Novu Bridge API endpoint |
| `app/.env.local` | Update | Add NOVU_* environment variables |
| `docs/development/novu-setup.md` | Create | Setup documentation |

## Implementation Details

### Option A: Novu Dashboard Configuration (Manual)

1. Log into Novu Cloud Dashboard
2. Create workflow "new-comment" with:
   - **In-App** step with template:
     - Title: `{{authorName}} commented`
     - Body: `on {{artifactDisplayTitle}}: "{{commentPreview}}"`
     - CTA: Link to `{{artifactUrl}}`
   - **Digest** step: Wait `{{digestInterval || 10}}` minutes
   - **Email** step with template:
     - Subject: `New activity on {{artifactDisplayTitle}}`
     - Body: Summary of digested comments

### Option B: Novu Framework (Code-Defined) - RECOMMENDED

Create workflow in code for version control and deployment consistency.

#### Workflow Definition

```typescript
// app/src/lib/novu/workflows/new-comment.ts
import { workflow } from "@novu/framework";

export const newCommentWorkflow = workflow("new-comment", async ({ step, payload }) => {
  // 1. Immediate in-app notification
  await step.inApp("in-app-notification", async () => ({
    subject: payload.isReply
      ? `${payload.authorName} replied`
      : `${payload.authorName} commented`,
    body: `on ${payload.artifactDisplayTitle}: "${payload.commentPreview}"`,
    avatar: payload.authorAvatarUrl,
    data: {
      url: payload.artifactUrl,
    },
  }));

  // 2. Digest for email batching
  const digestedEvents = await step.digest("digest-comments", async () => ({
    amount: parseInt(process.env.NOVU_DIGEST_INTERVAL || "10"),
    unit: "minutes",
  }));

  // 3. Send email with digest summary
  await step.email("email-notification", async () => {
    const commentCount = digestedEvents.events.length;
    return {
      subject: `${commentCount} new ${commentCount === 1 ? "comment" : "comments"} on ${payload.artifactDisplayTitle}`,
      body: renderDigestEmailBody(digestedEvents.events, payload),
    };
  });
});
```

#### Novu Bridge API Route

```typescript
// app/src/app/api/novu/route.ts
import { serve } from "@novu/framework/next";
import { newCommentWorkflow } from "@/lib/novu/workflows/new-comment";

export const { GET, POST, OPTIONS } = serve({
  workflows: [newCommentWorkflow],
});
```

### Environment Variables

```env
# .env.local
NOVU_SECRET_KEY=your-secret-key
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=your-app-id
NOVU_DIGEST_INTERVAL=10  # minutes (default)

# Optional: For local development with self-hosted Novu
NOVU_API_URL=http://localhost:3002
```

## Test Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| In-app notification | New comment triggers notification | Bell icon shows badge, notification in feed |
| Reply notification | Reply triggers notification | Thread participants notified |
| Email digest | Multiple comments within interval | Single email with all comments |
| Digest interval | Custom NOVU_DIGEST_INTERVAL=1 | Faster batching for testing |
| Workflow missing | Trigger non-existent workflow | Graceful error handling |

## Dependencies

- Subtask 01 (Subscriber Sync) should be complete for reliable delivery
- Novu account with API key
- Email provider configured in Novu (Resend recommended)

## Acceptance Criteria

- [ ] "new-comment" workflow exists and processes triggers
- [ ] In-app notifications appear immediately in bell icon
- [ ] Email notifications are batched per NOVU_DIGEST_INTERVAL
- [ ] Different message templates for comments vs replies
- [ ] Documentation created for local setup
