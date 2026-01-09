# Subtask 02: View History Tracking

**Parent Task:** 00030-track-artifact-views-and-presence
**Status:** OPEN
**Created:** 2026-01-04
**Completed:** 

---

## Objective

Implement a persistent tracking system to record when and by whom an artifact has been viewed.

---

## Requirements

1. **Schema Change:** Add a `artifactViews` table to `convex/schema.ts`.
   - `artifactId`: ID of the artifact.
   - `userId`: Optional ID of the authenticated user.
   - `anonymousEmail`: Optional email for unauthenticated users (if provided via invite).
   - `viewedAt`: Timestamp.
2. **Backend Logic:**
   - `artifacts.recordView`: Mutation to record a new view.
   - `artifacts.getViewHistory`: Query to list view history for an artifact.
3. **Frontend Integration:**
   - Trigger `recordView` when an artifact is successfully loaded in the viewer.
   - Avoid duplicate logging (e.g., within a session or within a short window).

---

## How This Will Be Used

Artifact owners will be able to see who has viewed their artifact and when, helping them track engagement and follow up on reviews.
