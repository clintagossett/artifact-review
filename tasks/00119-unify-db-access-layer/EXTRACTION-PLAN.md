# Extraction Plan — Shared Internal Functions

## Status: DESIGNED (Blocked on #112 for implementation)

## Design Principle

UI mutations are authoritative. Extract business logic from UI mutations into `internalMutation` functions. Both UI mutations and Agent API HTTP handlers call the same internals. Agent API becomes a thin HTTP auth layer.

## Established Pattern

`artifacts.createInternal` and `artifacts.addVersionInternal` already follow this pattern:
- `internalMutation` with explicit `userId: v.id("users")` arg
- Caller authenticates, then passes `userId` down
- All business logic lives in the internal

## New Files

| File | Contains |
|------|----------|
| `convex/commentsInternal.ts` | `createCommentInternal`, `editCommentInternal`, `deleteCommentInternal`, `toggleResolvedInternal`, `createReplyInternal`, `editReplyInternal`, `deleteReplyInternal` |
| `convex/accessInternal.ts` | `grantAccessInternal`, `revokeAccessInternal` |
| `convex/sharesInternal.ts` | `createShareLinkInternal`, `updateShareLinkInternal`, `deleteShareLinkInternal` |

## Shared Internal Signatures

### Comments

```
createCommentInternal(versionId, content, target, userId, agentId?) → commentId
  - Content validation (trim, empty, 10000 max)
  - Latest-version-only check
  - Insert with optional agentId
  - Notify artifact owner (until #112 triggers)

editCommentInternal(commentId, content, userId) → null
  - Author check (createdBy === userId)
  - Content validation
  - No-op if unchanged

deleteCommentInternal(commentId, userId) → null
  - Author OR artifact owner can delete (UI rule wins)
  - Cascade soft delete to replies

toggleResolvedInternal(commentId, userId, resolved?) → null
  - If resolved provided: set explicitly (Agent API)
  - If omitted: toggle (UI)
```

### Replies

```
createReplyInternal(commentId, content, userId, agentId?) → replyId
  - Content validation (trim, empty, 5000 max)
  - Insert with optional agentId
  - Notify comment author + thread participants (CRITICAL fix for Agent API)

editReplyInternal(replyId, content, userId) → null
  - Author check, content validation, no-op if unchanged

deleteReplyInternal(replyId, userId) → null
  - Author OR artifact owner can delete (UI rule wins)
```

### Access

```
grantAccessInternal(artifactId, email, userId, skipEmail?) → accessId
  - Email validation (regex)
  - Existing user vs invite path
  - Un-delete or create
  - Schedule invitation email (unless skipEmail)

revokeAccessInternal(accessId, userId) → null
  - Soft delete with audit trail
```

### Shares

```
createShareLinkInternal(artifactId, userId, capabilities?) → shareId
  - Idempotent (return existing)
  - Default: { readComments: false, writeComments: false } (UI wins)

updateShareLinkInternal(shareId, userId, enabled?, capabilities?) → null
  - Patch enabled and/or capabilities

deleteShareLinkInternal(shareId, userId) → null
  - Disable share link
```

## Caller Pattern After Extraction

### UI Mutation (thin wrapper)
```
getAuthUserId() → requireCommentPermission() → call internal
```

### Agent API HTTP Handler (thin wrapper)
```
requireAuth() → requireArtifactOwner() → call internal
```

## Divergences Resolved

| Divergence | Resolution |
|------------|-----------|
| No content validation in Agent API | Internal includes validation (UI logic) |
| No reply notifications in Agent API | Internal includes notifications (UI logic) |
| No invitation emails in Agent API | Internal includes email scheduling; `skipEmail` opt-out available |
| Agent API: author-only delete | Internal uses UI rule: author OR artifact owner |
| Share link defaults differ | Internal uses UI defaults: `readComments: false` |
| Agent API owner-only everywhere | HTTP handler retains `requireArtifactOwner`; internal is permission-agnostic |

## What Gets Deleted from agentApi.ts

All mutations: `createComment`, `createReply`, `updateCommentStatus`, `editComment`, `deleteComment`, `editReply`, `deleteReply`, `createShareLink`, `updateShareLink`, `deleteShareLink`, `grantAccess`, `revokeAccess`, `softDeleteVersionInternal`

Retained (queries only): `getLatestVersion`, `getComments`, `listArtifacts`, `getStats`, `listAccess`, `listVersionsInternal`, `getShareLink`

Also retained: `updateVersionNameInternal`, `restoreVersionInternal` (no UI equivalent yet)

## Notification Dependency on #112

Current plan embeds notification scheduling inside internals (matching UI). When #112 lands:
1. Remove `ctx.scheduler.runAfter` calls from internals
2. Triggers fire on table inserts automatically
3. Internals become pure DB operations
4. No caller changes needed

## Implementation Order

1. `commentsInternal.ts` — extract + rewire comments.ts, commentReplies.ts, http.ts
2. `accessInternal.ts` — extract + rewire access.ts, http.ts
3. `sharesInternal.ts` — extract + rewire shares.ts, http.ts
4. Version cleanup — UI softDeleteVersion calls existing internal
5. agentApi.ts cleanup — remove replaced mutations
6. Full test pass
