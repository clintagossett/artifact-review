# Architecture Review: Task 30 - Artifact Views & Presence Tracking

**Reviewer:** Antigravity (SaaS Architect / Convex Specialist)  
**Date:** 2026-01-04  
**Target Document:** `architecture_proposal.md`

## Executive Summary

The proposed architecture establishes a robust, privacy-centric foundation for tracking user engagement. The **3-Tier Tracking Model** (Live, Aggregate, Ledger) effectively decouples the high-velocity requirements of real-time presence from the analytical needs of historical reporting. This separation of concerns is critical for maintaining performance in a Convex environment.

The plan is **APPROVED** for implementation, subject to the specific implementation details outlined in the "Refinements & Recommendations" section below.

---

## Technical Analysis

### 1. Strengths of the Design

*   **Transactional Integrity**: Leveraging Convex's ACID mutations to update `artifactVersionStats` and `artifactAccess` simultaneously guarantees that the "convenience cache" never drifts from the source of truth. This is a perfect use case for Convex.
*   **Privacy First (PII-Safe)**: Storing only `userId` references and strictly resolving identity at read-time via the `users` table is the correct architectural choice. It simplifies data governance and ensures that if a user is deleted, their PII is gone, even if the statistical ID reference remains.
*   **Tiered Data Strategy**: 
    *   **Presence (Ephemeral)**: optimized for high-write, low-retention.
    *   **Stats (Aggregate)**: optimized for read-heavy dashboard queries ("How many people viewed v2?").
    *   **Views (Ledger)**: optimized for audit trails and deep analytics.
*   **Debounce Logic**: The 5-minute session window is a standard and effective pattern to prevent write amplification from simple page reloads.

### 2. Critical Refinements & Recommendations

While the architecture is sound, the following specific implementation details are required to ensure long-term stability and performance.

#### A. Presence Garbage Collection (Crucial)
The `presence` table is written to every 15 seconds per active user. Without a cleanup strategy, this table will explode in size, degrading index performance over time.
*   **Recommendation**: Implement a Convex **Cron Job** or sequential internal mutation loop that runs every 1-5 minutes to delete `presence` records older than `X` minutes (e.g., 60 minutes).
*   *Note: We only strictly care about the last ~45 seconds for "online" status, but keeping a small buffer helps debugging.*

#### B. Upsert Logic & Unique Constraints
Convex does not enforce unique constraints (like SQL `UNIQUE(artifactId, versionId, userId)`) at the schema level.
*   **Recommendation**: The mutation handling `artifactVersionStats` must be strictly idempotent.
    ```typescript
    // Pseudo-code for stable upsert
    const existingStats = await ctx.db
      .query("artifactVersionStats")
      .withIndex("by_artifact_version", (q) => 
        q.eq("artifactId", args.artifactId).eq("versionId", args.versionId)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    
    if (existingStats) {
       // Update logic
    } else {
       // Insert logic
    }
    ```
    *Note: The compound index `by_artifact_version` helps, but you still need to filter or find the specific user record carefully to avoid race-condition duplicates if the client spams the init call.*

#### C. `artifactAccess` Convenience Cache
The proposal mentions updating `artifactAccess` (the cache) for the "Last Viewed" timestamp.
*   **Validation**: This is acceptable **only** if `artifactAccess` controls permissions. If `artifactAccess` is strictly a join table for permissions, mixing "access control" with "access stats" (lastViewedAt) is a mild violation of separation of concerns, but often pragmatic in NoSQL.
*   **Safeguard**: Ensure that `lastViewedAt` updates do **not** trigger potentially expensive reactive flows that might listen to "permission changes".

### 3. Scalability Assessment

*   **Read Path**: High. Indexes `by_artifact_lastSeen` and `by_artifact_version` cover the critical dashboard queries perfectly.
*   **Write Path**: Moderate/High.
    *   Heartbeats (15s) are cheap in Convex.
    *   View recording (5m debounce) limits the heavy write load.
*   **Cost**: The design is cost-efficient. The storage footprint is minimized by essentially normalizing the User profile data.

---

## Approved Action Plan

1.  **Schema Definition**: Proceed with the schema as defined in the proposal.
2.  **Implementation**:
    *   Scaffold `presence` logic with client-side heartbeat hook.
    *   Implement `recordView` mutation with the 5-minute transactional lock/check.
3.  **Add**: Background cleanup task for `presence` table.

**Status**: READY FOR DEVELOPMENT
