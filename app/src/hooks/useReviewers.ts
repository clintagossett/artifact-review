/**
 * Hook to query and manage reviewers for an artifact
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export interface Reviewer {
  accessId: Id<"artifactAccess">;
  email: string;
  displayName: string;
  status: "pending" | "accepted";
  sendCount: number;
  lastSentAt: number;
}

/**
 * Query reviewers for an artifact (owner only)
 *
 * Returns:
 * - reviewers: Array of reviewer objects
 * - isLoading: true while query is loading
 */
export function useReviewers(artifactId: Id<"artifacts"> | undefined) {
  const reviewers = useQuery(
    api.access.listReviewers,
    artifactId ? { artifactId } : "skip"
  );

  return {
    reviewers: reviewers ?? [],
    isLoading: reviewers === undefined,
  };
}
