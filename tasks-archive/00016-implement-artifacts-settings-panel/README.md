# Task 00016: Implement Artifacts Settings Panel

**GitHub Issue:** #15
**Status:** IN PROGRESS
**Created:** 2025-12-27

---

## Resume (Start Here)

**Last Updated:** 2025-12-27 (Session 1)

### Current Status: Static UI Complete

**Phase:** Static UI lifted from Figma designs. Backend wiring needed.

### What We Did This Session

1. **Pulled latest figma-designs** submodule
2. **Lifted 6 components** from Figma with path/toast adjustments
3. **Created route** at `/a/[shareToken]/settings`
4. **Verified build** - No TypeScript errors in new components

### Next Steps

1. **Wire up backend** - Connect to real artifact data via Convex
2. **Add authentication** - Verify owner access
3. **Test UI** - Navigate to `/a/{any-token}/settings` to preview

---

## Objective

Implement a settings panel for individual artifacts with 3 tabs:
- **Versions** - Version history, rename, tag, delete, upload new
- **Access & Activity** - Reviewers, invites, activity stats, share link
- **Details** - Name/description editing, metadata

---

## Components Created

| File | Description |
|------|-------------|
| `src/components/ArtifactSettings.tsx` | Main container with tabs |
| `src/components/artifact-settings/ArtifactDetailsTab.tsx` | Details editing |
| `src/components/artifact-settings/ArtifactVersionsTab.tsx` | Version management |
| `src/components/artifact-settings/ArtifactAccessTab.tsx` | Access & activity |
| `src/components/artifact-settings/UploadNewVersionDialog.tsx` | File upload dialog |
| `src/components/artifact-settings/EntryPointDialog.tsx` | ZIP entry point selection |
| `src/components/artifact-settings/index.ts` | Barrel exports |
| `src/app/a/[shareToken]/settings/page.tsx` | Route page |

---

## How to Preview

1. Start dev servers: `./scripts/start-dev-servers.sh`
2. Navigate to: `http://localhost:3000/a/any-token/settings`
3. UI displays with mock data (not wired to backend yet)

---

## Design Reference

- **Figma docs:** `figma-designs/ARTIFACT_SETTINGS.md`
- **Source components:** `figma-designs/src/app/components/ArtifactSettings.tsx`

---

## Changes Made

### Created:
- `app/src/components/ArtifactSettings.tsx`
- `app/src/components/artifact-settings/` (6 files)
- `app/src/app/a/[shareToken]/settings/page.tsx`

### Adjustments from Figma:
- Import paths: `./ui/` → `@/components/ui/`
- Toast: `sonner` → `@/hooks/use-toast`
- EntryPointDialog: Simplified props to match usage

---

## Testing

Preview at `/a/any-token/settings` - all interactions work with mock data.

Backend wiring tests TBD.
