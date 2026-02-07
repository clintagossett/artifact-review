# Task 00089: Add Sharing & Access Management to Agent API

**GitHub Issue:** [#89](https://github.com/clintagossett/artifact-review/issues/89)
**Status:** Complete
**PR:** [#101](https://github.com/clintagossett/artifact-review/pull/101)

## Overview

Added 9 new Agent API endpoints for managing artifact sharing, access control, and analytics programmatically. This enables AI agents to:

- List their artifacts with summary statistics
- Create and manage public share links
- Invite specific users to review artifacts
- View detailed stats and analytics

## Endpoints Implemented

### 1. List Artifacts

```
GET /api/v1/artifacts
```

Returns all artifacts owned by the authenticated user with summary stats.

**Response:**
```json
{
  "artifacts": [
    {
      "id": "abc123",
      "name": "Landing Page V1",
      "shareToken": "xy12ab34",
      "shareUrl": "https://artifact.review/a/xy12ab34",
      "createdAt": 1707264000000,
      "latestVersion": 2,
      "stats": {
        "totalViews": 42,
        "commentCount": 8,
        "unresolvedCommentCount": 3
      }
    }
  ]
}
```

### 2. Create Share Link

```
POST /api/v1/artifacts/{shareToken}/sharelink
```

Creates a public share link for an artifact. Idempotent - updates if exists.

**Request:**
```json
{
  "enabled": true,
  "capabilities": {
    "readComments": true,
    "writeComments": false
  }
}
```

**Response (201):**
```json
{
  "shareUrl": "https://artifact.review/share/{token}",
  "enabled": true,
  "capabilities": {
    "readComments": true,
    "writeComments": false
  }
}
```

### 3. Get Share Link

```
GET /api/v1/artifacts/{shareToken}/sharelink
```

Returns the current share link settings.

**Response:**
```json
{
  "shareUrl": "https://artifact.review/share/{token}",
  "enabled": true,
  "capabilities": {
    "readComments": true,
    "writeComments": false
  }
}
```

### 4. Update Share Link

```
PATCH /api/v1/artifacts/{shareToken}/sharelink
```

Updates share link settings (enabled state, capabilities).

**Request:**
```json
{
  "enabled": false,
  "capabilities": {
    "readComments": true,
    "writeComments": true
  }
}
```

### 5. Delete Share Link

```
DELETE /api/v1/artifacts/{shareToken}/sharelink
```

Disables the share link (sets `enabled=false`).

**Response:**
```json
{
  "status": "deleted"
}
```

### 6. Grant Access

```
POST /api/v1/artifacts/{shareToken}/access
```

Invites a user to review an artifact by email.

**Request:**
```json
{
  "email": "reviewer@example.com",
  "role": "can-comment"
}
```

**Response (201):**
```json
{
  "id": "accessId123",
  "status": "created"
}
```

### 7. List Access

```
GET /api/v1/artifacts/{shareToken}/access
```

Returns all users with access to an artifact.

**Response:**
```json
{
  "access": [
    {
      "id": "abc123",
      "email": "reviewer@example.com",
      "name": "Jane Reviewer",
      "role": "can-comment",
      "status": "viewed",
      "firstViewedAt": 1707350400000,
      "lastViewedAt": 1707436800000
    },
    {
      "id": "def456",
      "email": "pending@example.com",
      "role": "can-comment",
      "status": "pending"
    }
  ]
}
```

### 8. Revoke Access

```
DELETE /api/v1/artifacts/{shareToken}/access/{accessId}
```

Removes a user's access to an artifact.

**Response:**
```json
{
  "status": "deleted"
}
```

### 9. Get Stats

```
GET /api/v1/artifacts/{shareToken}/stats
```

Returns detailed view and comment statistics.

**Response:**
```json
{
  "artifact": {
    "id": "abc123",
    "name": "Landing Page V1",
    "shareToken": "xy12ab34",
    "createdAt": 1707264000000
  },
  "stats": {
    "totalViews": 42,
    "uniqueViewers": 12,
    "commentCount": 8,
    "unresolvedCommentCount": 3,
    "lastViewedAt": 1707436800000,
    "lastViewedBy": "Jane Reviewer"
  },
  "versions": [
    {
      "number": 1,
      "commentCount": 5,
      "viewCount": 0
    },
    {
      "number": 2,
      "commentCount": 3,
      "viewCount": 0
    }
  ]
}
```

## Files Changed

| File | Description |
|------|-------------|
| `app/convex/agentApi.ts` | Added 8 internal queries/mutations for sharing, access, and stats |
| `app/convex/http.ts` | Added HTTP route handlers for all 9 endpoints |
| `app/convex/lib/openapi.ts` | Updated OpenAPI spec with new endpoint documentation |
| `app/convex/__tests__/agentApi-sharing.test.ts` | Added 27 unit tests |

## Authentication

All endpoints require API key authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: ar_live_..." https://api.artifact.review/api/v1/artifacts
```

## Authorization

- All endpoints require the caller to be the artifact owner
- Non-owners receive a `403 Forbidden` response
- Invalid/missing API keys receive `401 Unauthorized`

## Test Coverage

27 unit tests covering:

- List artifacts (4 tests)
- Share link CRUD (9 tests)
- Access management (8 tests)
- Stats retrieval (6 tests)

All tests pass as of implementation.

## Use Cases

### Use Case 1: Public Feedback
```bash
# 1. Create artifact
curl -X POST .../api/v1/artifacts -d '{"name": "Demo", ...}'

# 2. Create public share link
curl -X POST .../api/v1/artifacts/{token}/sharelink

# 3. Share the returned URL with anyone
```

### Use Case 2: Team Review
```bash
# 1. Create artifact
curl -X POST .../api/v1/artifacts -d '{"name": "Demo", ...}'

# 2. Invite team members
curl -X POST .../api/v1/artifacts/{token}/access -d '{"email": "team@example.com"}'

# 3. Check who has viewed
curl .../api/v1/artifacts/{token}/access
```

### Use Case 3: Monitor Feedback
```bash
# Check stats
curl .../api/v1/artifacts/{token}/stats

# Read comments
curl .../api/v1/artifacts/{token}/comments
```
