import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Hook for comment mutation operations
 *
 * Provides functions to create, update, delete, and resolve comments
 */
export function useCommentActions() {
  const createComment = useMutation(api.comments.create);
  const updateContent = useMutation(api.comments.updateContent);
  const toggleResolved = useMutation(api.comments.toggleResolved);
  const softDelete = useMutation(api.comments.softDelete);

  return {
    /**
     * Create a new comment
     *
     * @param versionId - Artifact version ID
     * @param content - Comment text
     * @param target - Target metadata (element ID, text selection, etc.)
     * @returns Comment ID
     */
    createComment: async (
      versionId: Id<"artifactVersions">,
      content: string,
      target: any
    ) => {
      return await createComment({ versionId, content, target });
    },

    /**
     * Update a comment's content
     *
     * @param commentId - Comment ID
     * @param content - New comment text
     */
    updateContent: async (commentId: Id<"comments">, content: string) => {
      return await updateContent({ commentId, content });
    },

    /**
     * Toggle a comment's resolved status
     *
     * @param commentId - Comment ID
     */
    toggleResolved: async (commentId: Id<"comments">) => {
      return await toggleResolved({ commentId });
    },

    /**
     * Soft delete a comment
     *
     * @param commentId - Comment ID
     */
    softDelete: async (commentId: Id<"comments">) => {
      return await softDelete({ commentId });
    },
  };
}
