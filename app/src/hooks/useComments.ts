import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Fetch all comments for an artifact version
 *
 * @param versionId - The artifact version ID
 * @param skip - If true, skip the query (used for unauthenticated public share viewers)
 * @returns Array of comments with author data and reply counts
 */
export function useComments(versionId: Id<"artifactVersions"> | undefined, skip?: boolean) {
  return useQuery(
    api.comments.getByVersion,
    versionId && !skip ? { versionId } : "skip"
  );
}

/**
 * Fetch comments via public share token (no auth required)
 *
 * Used for public share pages with view_read or view_readwrite access modes.
 *
 * @param versionId - The artifact version ID
 * @param publicShareToken - The public share link token
 * @param skip - If true, skip the query
 * @returns Array of comments or null if access mode doesn't allow
 */
export function usePublicComments(
  versionId: Id<"artifactVersions"> | undefined,
  publicShareToken: string | undefined,
  skip?: boolean
) {
  return useQuery(
    api.comments.getByVersionPublic,
    versionId && publicShareToken && !skip
      ? { versionId, publicShareToken }
      : "skip"
  );
}
