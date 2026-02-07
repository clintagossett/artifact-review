# Task 00061: Public Preview Links

**GitHub Issue:** #61
**Status:** In Progress

## Overview

Add public shareable links for artifacts with two access modes:
- **View Only**: Anyone with link can view, no authentication required
- **View + Comment**: Anyone can view, authentication required to leave comments

## Implementation Summary

### Phase 1: Schema & Backend (Complete)

**Files:**
- `app/convex/schema.ts` - Added `artifactShares` table
- `app/convex/shares.ts` - Created mutations and queries

**Schema:**
```typescript
artifactShares: defineTable({
  token: v.string(),                    // UUID for URL: /share/[token]
  artifactId: v.id("artifacts"),
  accessMode: v.union(v.literal("view"), v.literal("view_comment")),
  enabled: v.boolean(),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedBy: v.optional(v.id("users")),
  updatedAt: v.optional(v.number()),
})
  .index("by_token", ["token"])
  .index("by_artifactId", ["artifactId"]),
```

**API:**
- `shares.create` - Create share link (owner only, idempotent)
- `shares.toggleEnabled` - Toggle enabled state
- `shares.updateAccessMode` - Change view/view_comment
- `shares.getForArtifact` - Get share link for settings UI (owner only)
- `shares.resolveToken` - Public query to resolve token

### Phase 2: Settings UI (Complete)

**Files:**
- `app/src/components/artifact-settings/ShareLinkSection.tsx` - New component
- `app/src/components/artifact-settings/ArtifactAccessTab.tsx` - Integration

**Features:**
- "Create Public Link" button when no link exists
- Link display with copy button and "Copied!" feedback
- Enable/Disable toggle button
- Access mode dropdown (View Only / View + Comment)

### Phase 3: Public Share Page (Complete)

**Files:**
- `app/src/app/share/[token]/page.tsx` - Route handler
- `app/src/components/share/PublicSharePage.tsx` - Main page component
- `app/src/components/share/PublicArtifactViewer.tsx` - Viewer wrapper
- `app/src/components/share/ShareLinkUnavailable.tsx` - Unavailable state
- `app/src/components/share/index.ts` - Exports

**Features:**
- Resolves token via `resolveToken` query
- Shows unavailable page if token invalid/disabled
- View-only mode: No auth required, comments hidden
- View+Comment mode: Auth prompt banner, comments work if signed in

## Key Design Decisions

1. **One link per artifact** - Simpler UX, create returns existing if one exists
2. **No delete** - Only enable/disable (per issue requirements)
3. **UUID tokens** - `crypto.randomUUID()` for security
4. **Reuse ArtifactViewer** - Wrap with permission-aware logic
5. **No rate limiting in v1** - Can add later if needed

## Testing

### Unit Tests

```bash
cd app && npm test tests/convex-integration/shares.test.ts
```

**Test Coverage:**
- Create share link (owner, idempotent, access mode)
- Toggle enabled state
- Update access mode
- getForArtifact query
- resolveToken public query

### Manual Testing

1. Navigate to artifact Settings → Access tab
2. Click "Create Public Link"
3. Copy link and test in incognito:
   - View Only: Should see artifact, no comment UI
   - View + Comment: Should see auth prompt banner
4. Toggle link off and verify link shows unavailable
5. Toggle back on and verify link works again

## Files Changed

| File | Change |
|------|--------|
| `app/convex/schema.ts` | Added `artifactShares` table |
| `app/convex/shares.ts` | New file - all mutations/queries |
| `app/src/components/artifact-settings/ShareLinkSection.tsx` | New component |
| `app/src/components/artifact-settings/ArtifactAccessTab.tsx` | Added ShareLinkSection |
| `app/src/app/share/[token]/page.tsx` | New route |
| `app/src/components/share/PublicSharePage.tsx` | New component |
| `app/src/components/share/PublicArtifactViewer.tsx` | New component |
| `app/src/components/share/ShareLinkUnavailable.tsx` | New component |
| `app/src/components/share/index.ts` | New exports |

## Next Steps

- [ ] E2E tests for public share flow
- [ ] Update SESSION-RESUME.md
- [ ] Create PR
