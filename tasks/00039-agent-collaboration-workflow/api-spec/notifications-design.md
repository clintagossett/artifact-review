# Comment Notification Design

## The Problem

How does an AI agent know when a human has left new comments to review?

---

## Options

### Option A: Polling (Simple)

Agent periodically checks for new comments:

```bash
# Check every 5 minutes
GET /api/v1/artifacts/{token}/comments?since=2025-01-18T21:00:00Z
```

**Response includes:**
```json
{
  "comments": [...],
  "hasNew": true,
  "newCount": 3,
  "lastUpdatedAt": "2025-01-18T21:42:00Z"
}
```

| Pros | Cons |
|------|------|
| Simple to implement | Uses API quota |
| Works with any agent | Not real-time |
| No infrastructure needed | Agent must be running |

**Best for:** Initial dogfooding, simple integrations.

---

### Option B: Webhooks (Push Notifications)

Agent registers a webhook URL, we call it when comments arrive:

```bash
POST /api/v1/webhooks
{
  "url": "https://your-server.com/webhooks/artifact-review",
  "events": ["comment.created", "comment.reply"],
  "artifactId": "abc123"  // optional - filter to specific artifact
}
```

**We send:**
```json
{
  "event": "comment.created",
  "timestamp": "2025-01-18T21:42:00Z",
  "data": {
    "artifactId": "abc123",
    "artifactName": "RBAC Planning",
    "versionNumber": 2,
    "comment": {
      "id": "xyz789",
      "author": "Sarah Chen",
      "content": "Should we support multiple orgs?",
      "createdAt": "2025-01-18T21:42:00Z"
    }
  }
}
```

| Pros | Cons |
|------|------|
| Real-time notifications | Requires public endpoint |
| No polling needed | More complex to implement |
| Efficient for many artifacts | Agent needs server running |

**Best for:** CI/CD integrations, always-on bots.

---

### Option C: Email Notifications (Existing!)

We already have email notifications when comments are added. Agent could:
1. Monitor an inbox for emails from Artifact Review
2. Parse the email for artifact link and comment preview
3. Fetch full comments via API

| Pros | Cons |
|------|------|
| Already exists | Requires email parsing |
| Works everywhere | Higher latency |
| No API changes needed | Less structured data |

**Best for:** Immediate solution with no new development.

---

### ~~Option D: Long Polling / SSE~~ — NOT PLANNED

> **Decision:** SSE adds complexity without sufficient benefit for our use cases. Polling + Webhooks covers all needs.

---

## ✅ Final Decision

| Phase | Approach | When |
|-------|----------|------|
| **Phase 1** | Polling with `?since=` | Now / Dogfooding |
| **Phase 2** | Webhooks | When production integrations need push |
| ~~Phase 3~~ | ~~SSE~~ | ❌ Not planned |

---

## Polling Endpoint Enhancement

**Current:**
```
GET /api/v1/artifacts/{token}/comments
```

**Enhanced for polling:**
```
GET /api/v1/artifacts/{token}/comments?since=<timestamp>&unresolvedOnly=true
```

**Response:**
```json
{
  "comments": [...],
  "meta": {
    "total": 12,
    "newSinceTimestamp": 3,
    "unresolvedCount": 5,
    "lastActivityAt": "2025-01-18T21:42:00Z",
    "nextPollSuggested": "2025-01-18T21:47:00Z"
  }
}
```

**Features:**
- `since` - Only return comments after this timestamp
- `unresolvedOnly` - Skip resolved comments
- `nextPollSuggested` - Hint for when to poll again (avoids hammering API)

---

## For Dogfooding (Immediate Use)

For our use case (you and me collaborating on #38), the simplest approach:

1. I create/update artifact via API
2. You review and comment in browser
3. I poll for comments when you ask me to check
4. Or: I watch for your "check comments" prompt

No webhook infrastructure needed for this workflow.
