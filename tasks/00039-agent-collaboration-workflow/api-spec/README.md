# REST API Specification Summary

## Overview

This document summarizes the proposed REST API for AI agent collaboration with Artifact Review.

**Full Spec:** [openapi.yaml](./openapi.yaml)

---

## Endpoints at a Glance

### Artifacts

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/artifacts` | Create new artifact |
| `GET` | `/api/v1/artifacts` | List your artifacts |
| `GET` | `/api/v1/artifacts/{shareToken}` | Get artifact details |
| `DELETE` | `/api/v1/artifacts/{shareToken}` | Delete artifact |

### Versions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/artifacts/{shareToken}/versions` | Add new version |
| `GET` | `/api/v1/artifacts/{shareToken}/versions` | List versions |
| `GET` | `/api/v1/artifacts/{shareToken}/versions/{n}` | Get version content |

### Comments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/artifacts/{shareToken}/comments` | Get all comments (latest version) |
| `GET` | `/api/v1/artifacts/{shareToken}/versions/{n}/comments` | Get comments for specific version |
| `POST` | `/api/v1/artifacts/{shareToken}/versions/{n}/comments` | Add comment |
| `POST` | `/api/v1/artifacts/{shareToken}/comments/{id}/replies` | Reply to comment |
| `POST` | `/api/v1/artifacts/{shareToken}/comments/{id}/resolve` | Mark resolved |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/auth/keys` | List API keys |
| `POST` | `/api/v1/auth/keys` | Create API key |
| `DELETE` | `/api/v1/auth/keys/{id}` | Revoke API key |

---

## Authentication

### Option 1: API Keys (Programmatic Access)

```bash
curl -H "X-API-Key: ar_live_abc123..." https://artifact.review/api/v1/artifacts
```

API keys are created in the Artifact Review dashboard and passed via `X-API-Key` header.

### Option 2: OAuth / Social Login (Interactive Access)

For tools that support browser-based auth (Claude Desktop, some integrations):

```
1. Agent opens: https://artifact.review/api/v1/auth/oauth/start?redirect_uri=...
2. User logs in via Google/Microsoft/GitHub (social login)
3. Redirect back with short-lived token
4. Agent exchanges token for API key
```

**Supported Providers (Planned):**
- Google
- Microsoft
- GitHub

**Flow Diagram:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │     │  Artifact   │     │   Google/   │
│  (Claude)   │     │   Review    │     │  Microsoft  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Start OAuth    │                   │
       ├──────────────────>│                   │
       │                   │ 2. Redirect       │
       │<──────────────────┼──────────────────>│
       │                   │                   │
       │                   │ 3. User logs in   │
       │                   │<──────────────────┤
       │                   │                   │
       │ 4. Return token   │                   │
       │<──────────────────┤                   │
       │                   │                   │
       │ 5. Exchange for   │                   │
       │    API key        │                   │
       ├──────────────────>│                   │
       │                   │                   │
       │ 6. API key        │                   │
       │<──────────────────┤                   │
       └───────────────────┴───────────────────┘
```

**Benefits:**
- No manual API key copy/paste
- User authenticates with existing social account
- Agent gets scoped API key automatically

---

## Key Features for AI Agents

### 1. Markdown Comment Export

Get comments in a format optimized for AI agent context:

```bash
GET /api/v1/artifacts/abc123/comments?format=markdown
```

Returns:

```markdown
# Comments on "RBAC Planning Doc"

## Open Comments (3)

### Comment by Sarah Chen (2 hours ago)
> Should we support multiple orgs per user?

**Replies:**
- John: "Yes, common in B2B SaaS"
```

### 2. Simple Workflow

```bash
# 1. Create artifact
curl -X POST /api/v1/artifacts \
  -d '{"name":"Plan","fileType":"markdown","content":"# My Doc"}'
# Returns: {"shareToken":"abc123","shareUrl":"https://artifact.review/a/abc123"}

# 2. Get comments after human reviews
curl /api/v1/artifacts/abc123/comments?format=markdown

# 3. Update with new version
curl -X POST /api/v1/artifacts/abc123/versions \
  -d '{"content":"# Updated based on feedback..."}'
```

### 3. Rate Limits by Tier

| Tier | Requests/Hour |
|------|---------------|
| Free | 100 |
| Pro | 1,000 |
| Team | 10,000 |

---

## Questions for Review

1. **Path structure**: Is `/api/v1/artifacts/{shareToken}` clear, or should we use `/api/v1/a/{shareToken}` for brevity?

2. **Comment format**: Is the markdown export format useful for AI agents, or is JSON always better?

3. **Scoping**: Should the API support organization-level operations, or artifact-only for v1?

4. **Webhooks**: Should we add webhook support for comment notifications? (Not included in v1 spec)

5. **File format**: The spec supports markdown and HTML. Should we also support plain text?

---

## Implementation Notes

### Convex HTTP Routes

Convex supports HTTP routes which can implement this API. Key considerations:

- Auth: Validate API key, look up associated user
- Rate limiting: Track requests per key in database
- CORS: Enable for browser-based agents

### Existing Convex Functions to Reuse

| API Endpoint | Existing Convex Function |
|--------------|-------------------------|
| Create artifact | `artifacts.create` action |
| Add version | `artifacts.addVersion` action |
| Get comments | `comments.getByVersion` query |
| Add comment | `comments.create` mutation |
| Resolve comment | `comments.toggleResolved` mutation |

### New Infrastructure Needed

1. **API Keys table** - Store hashed keys with user association
2. **Rate limiting** - Track requests per key (can use @convex-dev/rate-limiter)
3. **HTTP route handlers** - Map REST paths to Convex functions
