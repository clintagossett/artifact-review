import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Hook for reply mutation operations
 *
 * Provides functions to create, update, and delete replies
 */
export function useReplyActions() {
  const createReply = useMutation(api.commentReplies.createReply);
  const updateReply = useMutation(api.commentReplies.updateReply);
  const softDeleteReply = useMutation(api.commentReplies.softDeleteReply);

  return {
    /**
     * Create a new reply to a comment
     *
     * @param commentId - Parent comment ID
     * @param content - Reply text
     * @returns Reply ID
     */
    createReply: async (commentId: Id<"comments">, content: string) => {
      return await createReply({ commentId, content });
    },

    /**
     * Update a reply's content
     *
     * @param replyId - Reply ID
     * @param content - New reply text
     */
    updateReply: async (replyId: Id<"commentReplies">, content: string) => {
      return await updateReply({ replyId, content });
    },

    /**
     * Soft delete a reply
     *
     * @param replyId - Reply ID
     */
    softDeleteReply: async (replyId: Id<"commentReplies">) => {
      return await softDeleteReply({ replyId });
    },
  };
}
