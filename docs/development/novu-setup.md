# Novu Notifications Setup

This guide covers setting up and testing Novu notifications for comment notifications in Artifact Review.

## Overview

The notification system uses:
- **Shared Novu Instance** - Self-hosted notification orchestration (https://novu.loc)
- **Novu Bridge** - Next.js API route for workflow discovery/execution
- **Novu Notification Center** - React component for in-app notifications

## Architecture

```
User comments → Convex trigger → Novu (local) → Bridge → Workflow → Notification
                                                                  ↓
                                                 In-App (real-time) + Email (digested)
```

## Prerequisites

The shared Novu instance must be running. See the infrastructure setup guide:
**`/home/clint-gossett/Documents/agentic-dev/docs/guides/shared-novu.md`**

## Environment Variables

### Required Variables

Add these to `.env.local`:

```bash
# Novu API endpoint (shared local instance)
NOVU_API_URL=https://api.novu.loc

# Novu Secret Key (get from https://novu.loc → Settings → API Keys)
NOVU_SECRET_KEY=your-secret-key

# Novu Application ID (get from https://novu.loc → Settings → API Keys)
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=your-app-id
```

### Optional Variables

```bash
# Override digest interval (default: 10 minutes)
# Set to 1 for faster testing
NOVU_DIGEST_INTERVAL=1
```

## Local Development Setup

### 1. Create Novu Organization (First Time Only)

**IMPORTANT:** On first-time setup, the local Novu database is empty. You must create an account and organization (data persists after setup).

**Option A: Automated Setup (Recommended)**

```bash
./scripts/setup-novu-org.sh
```

This script will:
- Check if Novu is available (fails gracefully with instructions if not)
- Create user and organization with standard credentials
- Retrieve API keys
- Update `app/.env.local` automatically

To check if already configured:
```bash
./scripts/setup-novu-org.sh --check
```

**Option B: Manual Setup**

Standard credentials (use these exact values):

| Field | Value |
|-------|-------|
| Email | `admin@mark.loc` |
| Password | `Password123$` |
| Organization | `mark-artifact-review` |

1. Ensure orchestrator is running: `cd /home/clint-gossett/Documents/agentic-dev/orchestrator && ./start.sh`
2. Go to https://novu.loc
3. Click **Sign Up** with the standard credentials above
4. Create organization `mark-artifact-review` when prompted
5. Go to **Settings → API Keys**
6. Copy the **Secret Key** and **Application Identifier**

### 2. Configure Environment

If you used the automated setup, `.env.local` is already configured.

For manual setup, add the credentials to your `.env.local`:

```bash
cd app
# Edit .env.local with your Novu credentials from Step 1
```

Example:
```bash
NOVU_API_URL=https://api.novu.loc
NOVU_SECRET_KEY=abc123...
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=def456...
```

### 3. Start Development Servers

```bash
./scripts/start-dev-servers.sh
```

### 4. Sync Bridge Endpoint

After starting dev servers, Novu needs to discover your workflow:

1. Go to https://novu.loc → **Integrations** → **Local Studio** (or "Bridge Sync")
2. Enter your local bridge URL: `https://api.mark.loc/api/novu`
3. Click **Sync**

The workflow should now appear in your Novu dashboard under **Workflows**.

## Workflow Details

### Workflow: `new-comment`

Located at: `app/src/app/api/novu/workflows/comment-workflow.ts`

#### Payload Schema

```typescript
{
  artifactDisplayTitle: string;  // Required: e.g., "My Design Doc"
  authorName: string;            // Required: e.g., "John Doe"
  commentPreview: string;        // Required: e.g., "This looks great!"
  artifactUrl: string;           // Required: e.g., "https://..."
  authorAvatarUrl?: string;      // Optional: avatar image URL
  isReply?: boolean;             // Optional: true if replying to a comment
  isCommentAuthor?: boolean;     // Optional: true if recipient is comment author
}
```

#### Steps

1. **In-App Notification** - Real-time bell icon notification
2. **Digest** - Batches notifications for 10 minutes (configurable)
3. **Email** - Sends digested email with all notifications

### Notification Content

#### In-App Subject Lines

| Scenario | Subject |
|----------|---------|
| New comment | "New comment on {artifactTitle}" |
| Reply to author | "{authorName} replied to your comment" |
| Reply to participant | "New reply on {artifactTitle}" |

#### Email Subject Lines

| Scenario | Subject |
|----------|---------|
| Single comment | "New comment from {author} on {artifact}" |
| Single reply | "{author} replied on {artifact}" |
| Multiple comments | "3 comments on {artifact}" |
| Mixed | "2 comments and 1 reply on {artifact}" |

## Testing

### Run Unit Tests

```bash
cd app
npm run test -- ../tasks/00043-novu-comment-notifications/02-novu-workflow-setup/tests/unit/
```

### Test Manually

1. Create a comment on an artifact
2. Wait for digest interval (default 10min, set `NOVU_DIGEST_INTERVAL=1` for faster)
3. Check the bell icon for in-app notification
4. Check email inbox for digest email

### Test Selectors (E2E)

The NotificationCenter component includes test selectors:

- `data-testid="notification-bell"` - Bell icon container
- `data-testid="notification-badge"` - Unseen count badge
- `data-testid="notification-count"` - Count number

## Troubleshooting

### Bridge Not Syncing

1. Ensure `NOVU_SECRET_KEY` is set correctly
2. Check that the dev server is running on port 3000
3. Verify the bridge URL: `http://localhost:3000/api/novu`
4. Check browser network tab for errors

### Notifications Not Appearing

1. Verify subscriber is created (check `users` table for `novuSubscriberId`)
2. Check Novu dashboard for activity logs
3. Ensure `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` is correct
4. Check browser console for Novu errors

### Email Not Sending

1. Wait for digest interval to complete
2. Check Novu dashboard → Activity → Email logs
3. Verify email integration is configured in Novu

### Wrong Content in Notifications

1. Check payload schema matches expected format
2. Verify `isReply` and `isCommentAuthor` flags are set correctly
3. Run unit tests to verify content generation logic

## Files Reference

| File | Purpose |
|------|---------|
| `app/src/app/api/novu/route.ts` | Bridge endpoint (GET, POST, OPTIONS) |
| `app/src/app/api/novu/workflows/comment-workflow.ts` | Workflow definition |
| `app/src/components/NotificationCenter.tsx` | React notification bell |
| `app/convex/novu.ts` | Backend trigger functions |
| `app/.env.local.example` | Environment variable template |

## Related Documentation

- [Shared Novu Setup](/home/clint-gossett/Documents/agentic-dev/docs/guides/shared-novu.md) - Infrastructure setup
- [Environment Template](/home/clint-gossett/Documents/agentic-dev/docs/agents/env-template.md) - All env vars
- [Novu Framework Docs](https://docs.novu.co/framework/introduction)
- [Novu Notification Center](https://docs.novu.co/notification-center/introduction)
- [Convex Backend Rules](../architecture/convex-rules.md)
