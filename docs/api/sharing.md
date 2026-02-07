# Sharing & Access Management API

This guide covers the Agent API endpoints for managing artifact sharing, access control, and analytics.

## Overview

The Sharing & Access API enables AI agents to:

- **Share publicly**: Create shareable links anyone can access
- **Invite reviewers**: Grant specific users access via email
- **Track engagement**: Monitor views, comments, and reviewer activity
- **Manage permissions**: Control what viewers can do (read/write comments)

## Authentication

All endpoints require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: ar_live_xxxxxxxxxxxx" \
  https://api.artifact.review/api/v1/artifacts
```

You can also use Bearer authentication:

```bash
curl -H "Authorization: Bearer ar_live_xxxxxxxxxxxx" \
  https://api.artifact.review/api/v1/artifacts
```

## Endpoints

### List Your Artifacts

Get all artifacts you own with summary statistics.

```http
GET /api/v1/artifacts
```

**Response:**

```json
{
  "artifacts": [
    {
      "id": "k17abc123",
      "name": "Marketing Landing Page",
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

Use this to build a dashboard showing which artifacts need attention (unresolved comments).

---

## Public Share Links

Share links allow anyone with the URL to view your artifact without signing in.

### Create a Share Link

```http
POST /api/v1/artifacts/{shareToken}/sharelink
```

**Request Body (optional):**

```json
{
  "enabled": true,
  "capabilities": {
    "readComments": true,
    "writeComments": false
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Whether the link is active |
| `capabilities.readComments` | `true` | Can viewers see existing comments? |
| `capabilities.writeComments` | `false` | Can viewers add new comments? |

**Response (201 Created):**

```json
{
  "shareUrl": "https://artifact.review/share/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "enabled": true,
  "capabilities": {
    "readComments": true,
    "writeComments": false
  }
}
```

### Get Share Link Settings

```http
GET /api/v1/artifacts/{shareToken}/sharelink
```

Returns current share link configuration, or `404` if none exists.

### Update Share Link

```http
PATCH /api/v1/artifacts/{shareToken}/sharelink
```

**Request Body:**

```json
{
  "enabled": false
}
```

Partial updates are supported. Only include the fields you want to change.

### Disable Share Link

```http
DELETE /api/v1/artifacts/{shareToken}/sharelink
```

Disables the share link. The URL will return a "not available" message to visitors.

---

## Access Management

Invite specific users to review your artifacts. They'll receive an email invitation.

### Invite a Reviewer

```http
POST /api/v1/artifacts/{shareToken}/access
```

**Request Body:**

```json
{
  "email": "reviewer@example.com",
  "role": "can-comment"
}
```

Currently only the `can-comment` role is supported.

**Response (201 Created):**

```json
{
  "id": "k17xyz789",
  "status": "created"
}
```

**Behavior:**
- If the email belongs to an existing user, they're granted access immediately
- If the email is new, an invite is created and they get access when they sign up
- Calling again for the same email is idempotent (returns the existing access ID)

### List Reviewers

```http
GET /api/v1/artifacts/{shareToken}/access
```

**Response:**

```json
{
  "access": [
    {
      "id": "k17abc123",
      "email": "jane@example.com",
      "name": "Jane Smith",
      "role": "can-comment",
      "status": "viewed",
      "firstViewedAt": 1707350400000,
      "lastViewedAt": 1707436800000
    },
    {
      "id": "k17def456",
      "email": "pending@example.com",
      "role": "can-comment",
      "status": "pending"
    }
  ]
}
```

**Status Values:**
- `pending` - Invited but hasn't signed up yet
- `added` - Has account but hasn't viewed the artifact
- `viewed` - Has viewed the artifact at least once

### Revoke Access

```http
DELETE /api/v1/artifacts/{shareToken}/access/{accessId}
```

Removes a user's access to the artifact.

---

## Analytics

### Get Artifact Stats

```http
GET /api/v1/artifacts/{shareToken}/stats
```

**Response:**

```json
{
  "artifact": {
    "id": "k17abc123",
    "name": "Marketing Landing Page",
    "shareToken": "xy12ab34",
    "createdAt": 1707264000000
  },
  "stats": {
    "totalViews": 42,
    "uniqueViewers": 12,
    "commentCount": 8,
    "unresolvedCommentCount": 3,
    "lastViewedAt": 1707436800000,
    "lastViewedBy": "Jane Smith"
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

Use this to:
- Check if reviewers have viewed your artifact
- See how many comments need attention
- Track engagement over time

---

## Common Workflows

### Workflow 1: Quick Public Share

Share an artifact publicly for anyone to view:

```bash
# 1. Create the artifact
RESPONSE=$(curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Demo", "fileType": "html", "content": "<h1>Hello</h1>"}' \
  https://api.artifact.review/api/v1/artifacts)

SHARE_TOKEN=$(echo $RESPONSE | jq -r '.shareToken')

# 2. Create public share link
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  https://api.artifact.review/api/v1/artifacts/$SHARE_TOKEN/sharelink

# Returns the public URL to share
```

### Workflow 2: Team Review

Invite specific team members:

```bash
# Invite reviewers
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@team.com"}' \
  https://api.artifact.review/api/v1/artifacts/$SHARE_TOKEN/access

curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@team.com"}' \
  https://api.artifact.review/api/v1/artifacts/$SHARE_TOKEN/access

# Check who has viewed
curl -H "X-API-Key: $API_KEY" \
  https://api.artifact.review/api/v1/artifacts/$SHARE_TOKEN/access
```

### Workflow 3: Monitor Feedback

Check for new feedback on your artifacts:

```bash
# Get overview of all artifacts
curl -H "X-API-Key: $API_KEY" \
  https://api.artifact.review/api/v1/artifacts

# Get detailed stats for one artifact
curl -H "X-API-Key: $API_KEY" \
  https://api.artifact.review/api/v1/artifacts/$SHARE_TOKEN/stats

# Read the actual comments
curl -H "X-API-Key: $API_KEY" \
  https://api.artifact.review/api/v1/artifacts/$SHARE_TOKEN/comments
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Bad request (invalid JSON or missing required fields) |
| `401` | Unauthorized (invalid or missing API key) |
| `403` | Forbidden (you don't own this artifact) |
| `404` | Not found (artifact or resource doesn't exist) |
| `500` | Server error |

All error responses include a JSON body:

```json
{
  "error": "Description of what went wrong"
}
```

---

## Related

- [Agent API Overview](./README.md) - Full API documentation
- [OpenAPI Spec](/api/v1/openapi.yaml) - Machine-readable API specification
- [Comments API](./comments.md) - Reading and writing feedback
