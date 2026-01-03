/**
 * Access control utilities for frontend
 */

import type { Doc } from "../../../convex/_generated/dataModel";

/**
 * Derive reviewer status from access record
 *
 * Status derivation logic:
 * - "removed": Access is soft-deleted (isDeleted = true)
 * - "pending": No userId (userInviteId only) - user hasn't signed up yet
 * - "viewed": Has userId and firstViewedAt - user has viewed the artifact
 * - "added": Has userId but no firstViewedAt - user signed up but hasn't viewed
 */
export function deriveReviewerStatus(
  access: Doc<"artifactAccess">
): "pending" | "added" | "viewed" | "removed" {
  if (access.isDeleted) {
    return "removed";
  }

  if (!access.userId) {
    return "pending";
  }

  if (access.firstViewedAt) {
    return "viewed";
  }

  return "added";
}
