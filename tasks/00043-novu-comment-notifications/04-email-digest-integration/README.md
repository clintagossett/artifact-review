# Subtask 04: Email Digest Integration

## Objective

Configure email notifications to use Novu's digest feature, batching multiple comments/replies into a single email instead of sending one email per notification.

## Context

From `docs/journeys/003-reviewer-comments-and-feedback.md`:
- Emails batched via Novu digest (`NOVU_DIGEST_INTERVAL`)
- Default: 10 minutes, can be set to 1 for testing
- Subject line should reflect count: "X new comments on [Artifact]"

Currently:
- In-app notifications work (Subtask 02)
- Email provider (Resend) is configured in Novu
- Digest node needs to be added to workflow

## Technical Approach

### Digest Workflow Pattern

```
Trigger Event
  ↓
In-App Step (immediate)
  ↓
Digest Node (collect events for X minutes)
  ↓
Email Step (send batched summary)
```

### Digest Configuration Options

1. **Regular Digest** - Wait fixed time, then send all
2. **Timed Digest** - Wait until specific time (e.g., 9 AM)
3. **Backoff Digest** - Reset timer on each new event

We'll use **Regular Digest** with configurable interval.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/src/lib/novu/workflows/new-comment.ts` | Modify | Add digest step |
| `app/src/lib/novu/templates/comment-digest.tsx` | Create | React Email template |
| `convex/novu.ts` | Modify | Pass digest metadata |
| `.env.local` | Update | Add NOVU_DIGEST_INTERVAL |

## Implementation Details

### Workflow with Digest

```typescript
// app/src/lib/novu/workflows/new-comment.ts
import { workflow, CronExpression } from "@novu/framework";

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

  // 2. Digest step - collect events for interval
  const digestedEvents = await step.digest("digest-comments", async () => ({
    amount: parseInt(process.env.NOVU_DIGEST_INTERVAL || "10"),
    unit: "minutes",
  }));

  // 3. Email step - only fires after digest
  await step.email("email-digest", async () => {
    const events = digestedEvents.events;
    const count = events.length;

    // Group by artifact for multi-artifact digest
    const byArtifact = groupByArtifact(events);

    return {
      subject: formatSubject(events),
      body: renderDigestEmail(events, payload),
    };
  });
});

function formatSubject(events: DigestEvent[]): string {
  const count = events.length;
  const firstEvent = events[0]?.payload;

  if (count === 1) {
    return firstEvent?.isReply
      ? `${firstEvent.authorName} replied on ${firstEvent.artifactDisplayTitle}`
      : `${firstEvent.authorName} commented on ${firstEvent.artifactDisplayTitle}`;
  }

  // Multiple events - show count
  const hasReplies = events.some(e => e.payload?.isReply);
  const hasComments = events.some(e => !e.payload?.isReply);

  if (hasReplies && hasComments) {
    return `${count} new activity on your artifacts`;
  } else if (hasReplies) {
    return `${count} new replies on your artifacts`;
  } else {
    return `${count} new comments on your artifacts`;
  }
}
```

### Email Template (React Email)

```tsx
// app/src/lib/novu/templates/comment-digest.tsx
import { Html, Body, Container, Section, Text, Link, Hr, Img } from "@react-email/components";

interface DigestEvent {
  payload: {
    authorName: string;
    authorAvatarUrl?: string;
    artifactDisplayTitle: string;
    artifactUrl: string;
    commentPreview: string;
    isReply?: boolean;
  };
}

export function CommentDigestEmail({ events }: { events: DigestEvent[] }) {
  return (
    <Html>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Activity on your artifacts</Text>
          </Section>

          {events.map((event, i) => (
            <Section key={i} style={commentSection}>
              <Text style={authorLine}>
                <strong>{event.payload.authorName}</strong>
                {event.payload.isReply ? " replied" : " commented"} on{" "}
                <Link href={event.payload.artifactUrl}>
                  {event.payload.artifactDisplayTitle}
                </Link>
              </Text>
              <Text style={commentPreview}>
                "{event.payload.commentPreview}"
              </Text>
              <Hr />
            </Section>
          ))}

          <Section style={footer}>
            <Text>
              <Link href="{{unsubscribeUrl}}">Unsubscribe</Link> from these notifications
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = { margin: "0 auto", padding: "20px", maxWidth: "580px" };
const heading = { fontSize: "20px", fontWeight: "bold" };
const commentSection = { marginBottom: "16px" };
const authorLine = { fontSize: "14px", marginBottom: "4px" };
const commentPreview = { fontSize: "14px", color: "#6b7280", fontStyle: "italic" };
const footer = { marginTop: "24px", fontSize: "12px", color: "#9ca3af" };
```

### Environment Configuration

```env
# .env.local
NOVU_DIGEST_INTERVAL=10  # minutes

# For E2E testing, use shorter interval:
# NOVU_DIGEST_INTERVAL=1
```

### Digest Behavior by Interval

| NOVU_DIGEST_INTERVAL | Behavior |
|---------------------|----------|
| 1 | 1 minute batching (for testing) |
| 10 (default) | 10 minute batching |
| 60 | Hourly digest |
| 1440 | Daily digest |

## Test Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Single comment | One comment within interval | Email sent after interval |
| Multiple comments | 3 comments within interval | Single email with count |
| Different artifacts | Comments on 2 artifacts | Grouped in email |
| Replies mixed | Comments + replies | Subject reflects both |
| Immediate in-app | Comment triggers | In-app is immediate |
| Digest timing | NOVU_DIGEST_INTERVAL=1 | Email after 1 minute |

## Dependencies

- Subtask 02 (Workflow Setup) must be complete
- Resend provider configured in Novu dashboard
- React Email templates working

## Acceptance Criteria

- [ ] Digest node added to new-comment workflow
- [ ] Email sent after NOVU_DIGEST_INTERVAL minutes
- [ ] Multiple events batched into single email
- [ ] Subject line reflects event count and type
- [ ] Email template renders cleanly
- [ ] Unsubscribe link works
- [ ] E2E test validates digest timing (with NOVU_DIGEST_INTERVAL=1)
