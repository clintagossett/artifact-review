# Agent API Documentation

API documentation for AI agents integrating with Artifact Review.

## Guides

| Guide | Description |
|-------|-------------|
| [sharing.md](./sharing.md) | Sharing, access management, and analytics endpoints |

## Authentication

All Agent API endpoints require an API key:

```bash
curl -H "X-API-Key: ar_live_xxxxxxxxxxxx" \
  https://api.artifact.review/api/v1/artifacts
```

## Base URL

- **Production:** `https://api.artifact.review`
- **Local Development:** `http://localhost:3211` (or your agent's port)

## OpenAPI Specification

The full OpenAPI spec is available at:

```
GET /api/v1/openapi.yaml
```

## Endpoint Summary

### Artifacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/artifacts` | Create new artifact |
| GET | `/api/v1/artifacts` | List all artifacts |

### Sharing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/artifacts/{shareToken}/sharelink` | Create share link |
| GET | `/api/v1/artifacts/{shareToken}/sharelink` | Get share link |
| PATCH | `/api/v1/artifacts/{shareToken}/sharelink` | Update share link |
| DELETE | `/api/v1/artifacts/{shareToken}/sharelink` | Disable share link |

### Access
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/artifacts/{shareToken}/access` | Invite user |
| GET | `/api/v1/artifacts/{shareToken}/access` | List access |
| DELETE | `/api/v1/artifacts/{shareToken}/access/{id}` | Revoke access |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/artifacts/{shareToken}/stats` | Get artifact stats |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/artifacts/{shareToken}/comments` | Get comments |
| POST | `/api/v1/artifacts/{shareToken}/comments` | Create comment |
| PATCH | `/api/v1/comments/{commentId}` | Update comment |
| DELETE | `/api/v1/comments/{commentId}` | Delete comment |
| POST | `/api/v1/comments/{commentId}/replies` | Create reply |
| PATCH | `/api/v1/replies/{replyId}` | Update reply |
| DELETE | `/api/v1/replies/{replyId}` | Delete reply |
