# Subtask 01: Presence Implementation

**Parent Task:** 00030-track-artifact-views-and-presence
**Status:** OPEN
**Created:** 2026-01-04
**Completed:** 

---

## Objective

Implement a real-time presence system using Convex to show who is currently viewing an artifact.

---

## Requirements

1. **Schema Change:** Add a `presence` table to `convex/schema.ts`.
   - `userIdentifier`: String (email or userId if authenticated, or a session ID for anonymous).
   - `artifactId`: ID of the artifact being viewed.
   - `lastSeen`: Timestamp (number).
   - `data`: Any additional data (e.g., user name, color).
2. **Backend Logic:**
   - `presence.update`: Mutation to update the user's presence for an artifact.
   - `presence.list`: Query to list all active presence records for an artifact.
   - Automatic cleanup? Convex usually handles this by filtering for `lastSeen > now - window`.
3. **Frontend Integration:**
   - `usePresence` hook to send periodic heartbeats while component is mounted.
   - Profile circle/indicator component to show users currently viewing.

---

## How This Will Be Used

The viewer page will use this subtask's implementation to display a list of active reviewers/viewers in the header.
