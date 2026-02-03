# Task 00043: Implement Novu Notifications for Comments

**GitHub Issue:** https://github.com/clintagossett/artifact-review/issues/43
**Project:** artifact-review
**Location:** `/home/clint-gossett/Documents/agentic-dev/agents/mark/artifact-review/`

---

## Objective

Implement Novu notifications for the commenting system so users are notified when someone comments on their artifact or replies to their comments.

## Requirements

From [Journey 003 - Reviewer Comments & Feedback](docs/journeys/003-reviewer-comments-and-feedback.md):

### In-App Notifications (Bell Icon)

| Event | Recipient | Message |
|-------|-----------|---------|
| New Comment | Artifact Owner | "[Author] commented on [Artifact]" |
| Reply to Comment | Comment Author | "[Author] replied to your comment" |
| Reply in Thread | Thread Participants | "[Author] replied in a thread you follow" |

### Email Digest

| Event | Recipient | Subject |
|-------|-----------|---------|
| New Comment(s) | Artifact Owner | "X new comments on [Artifact]" |
| Reply/Replies | Thread Participants | "X new replies on [Artifact]" |

Emails batched via Novu digest (`NOVU_DIGEST_INTERVAL`).

## Context Files

```
artifact-review/
├── docs/journeys/003-reviewer-comments-and-feedback.md  # Requirements
├── docs/SHARED-NOVU.md                                   # Novu setup
├── app/tests/e2e/notification.spec.ts                    # E2E tests
├── convex/comments.ts                                    # Comment mutations
├── convex/commentReplies.ts                              # Reply mutations
└── convex/novu.ts                                        # Novu integration (if exists)
```

## Approach

1. **Architect phase:**
   - Map notification triggers to Convex mutations
   - Design Novu workflow structure
   - Create subtask breakdown

2. **TDD phase:**
   - Fix/write E2E tests for each notification scenario
   - Test in-app notification appearance
   - Test email digest batching

3. **Implementation:**
   - Wire up Novu triggers in `comments.ts` and `commentReplies.ts`
   - Ensure proper recipient resolution (owner, author, participants)

## Success Criteria

- [ ] New comment triggers notification to artifact owner
- [ ] Reply triggers notification to comment author
- [ ] Reply triggers notification to thread participants
- [ ] In-app notifications appear in bell icon
- [ ] Email digest batches notifications correctly
- [ ] E2E tests passing (`notification.spec.ts`)

---

## Findings

### What's Already Implemented ✅

| Component | Status | Details |
|-----------|--------|---------|
| `convex/novu.ts` | ✅ Exists | `triggerCommentNotification`, `triggerReplyNotification` actions |
| `convex/comments.ts` | ✅ Wired | Calls `triggerCommentNotification` on create |
| `convex/commentReplies.ts` | ✅ Wired | Calls `triggerReplyNotification` with thread participant logic |
| `NotificationCenter.tsx` | ✅ Exists | Uses `@novu/notification-center` |
| `DashboardHeader.tsx` | ✅ Integrated | Bell icon visible with userId |
| Docker setup | ✅ Exists | `docker-compose.novu.yml` for self-hosted |

### What's Missing ❌

| Component | Status | Gap |
|-----------|--------|-----|
| Subscriber sync | ❌ Missing | Users not registered in Novu on signup |
| Novu workflow | ❌ Not confirmed | "new-comment" workflow may not exist in Novu |
| Email digest | ❌ Missing | Digest node not configured |
| E2E tests | ❌ Missing | `notification.spec.ts` doesn't exist |
| Test selectors | ❌ Missing | No `data-testid` on bell/badge |

### Architecture Analysis

**Notification Flow:**
```
User creates comment/reply
  ↓
Convex mutation (comments.ts / commentReplies.ts)
  ↓
ctx.scheduler.runAfter(0, internal.novu.trigger*)
  ↓
Novu action sends to workflow "new-comment"
  ↓
Novu processes workflow:
  └── In-App step → WebSocket to NotificationCenter
  └── Digest step → Wait NOVU_DIGEST_INTERVAL
  └── Email step → Resend provider
```

**Key Files:**
- `app/convex/novu.ts` - Backend triggers
- `app/src/components/NotificationCenter.tsx` - Frontend bell
- `app/src/components/artifacts/DashboardHeader.tsx` - Uses NotificationCenter

---

## Subtask Structure

```
tasks/00043-novu-comment-notifications/
├── README.md (this file)
├── 01-subscriber-sync/
│   └── README.md
├── 02-novu-workflow-setup/
│   └── README.md
├── 03-e2e-notification-tests/
│   └── README.md
└── 04-email-digest-integration/
    └── README.md
```

### Subtask Dependencies

```
01-subscriber-sync ──┐
                     ├──→ 03-e2e-notification-tests
02-novu-workflow-setup┘
                     │
                     ↓
                04-email-digest-integration
```

### Subtask Summary

| # | Subtask | Description | Effort |
|---|---------|-------------|--------|
| 01 | [Subscriber Sync](01-subscriber-sync/README.md) | Sync users to Novu on signup/login | Medium |
| 02 | [Workflow Setup](02-novu-workflow-setup/README.md) | Configure Novu workflow and templates | Medium |
| 03 | [E2E Tests](03-e2e-notification-tests/README.md) | Write notification E2E tests | High |
| 04 | [Email Digest](04-email-digest-integration/README.md) | Add digest batching for emails | Medium |

### Recommended Order

1. **01-subscriber-sync** - Without this, notifications silently fail
2. **02-novu-workflow-setup** - Define what happens when trigger fires
3. **03-e2e-notification-tests** - Validate in-app works before email
4. **04-email-digest-integration** - Final polish with batched emails
