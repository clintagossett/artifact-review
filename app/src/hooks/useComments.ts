import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Fetch all comments for an artifact version
 *
 * @param versionId - The artifact version ID
 * @returns Array of comments with author data and reply counts
 */
export function useComments(versionId: Id<"artifactVersions"> | undefined) {
  return useQuery(
    api.comments.getByVersion,
    versionId ? { versionId } : "skip"
  );
}
