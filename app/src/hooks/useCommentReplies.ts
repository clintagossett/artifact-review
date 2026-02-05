import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Fetch all replies for a comment
 *
 * @param commentId - The comment ID
 * @param skip - Whether to skip fetching (e.g., on public share pages)
 * @returns Array of replies with author data
 */
export function useCommentReplies(commentId: Id<"comments"> | undefined, skip?: boolean) {
  return useQuery(
    api.commentReplies.getReplies,
    commentId && !skip ? { commentId } : "skip"
  );
}
