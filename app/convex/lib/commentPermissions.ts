/**
 * Comment Permission Helpers
 *
 * Internal functions for checking comment access permissions.
 * These helpers are used by comment and reply operations to enforce
 * the permission model.
 *
 * Permission Model:
 * - Owner: Artifact creator (full access)
 * - Reviewer: Invited collaborator (can view, create, edit own, delete own)
 * - Outsider: No access (throws error)
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Require owner or reviewer permission for a version.
 * Throws Error if unauthorized.
 *
 * @param ctx - Query or Mutation context
 * @param versionId - The artifact version to check
 * @returns "owner" or "can-comment"
 * @throws Error if not authenticated or no permission
 */
export async function requireCommentPermission(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"artifactVersions">
): Promise<"owner" | "can-comment"> {
  // Check authentication
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  // Get version (check not deleted)
  const version = await ctx.db.get(versionId);
  if (!version || version.isDeleted) {
    throw new Error("Version not found");
  }

  // Get artifact (check not deleted)
  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact || artifact.isDeleted) {
    throw new Error("Artifact not found");
  }

  // Check if user is owner
  if (artifact.createdBy === userId) {
    return "owner";
  }

  // Check if user is an invited reviewer
  // NOTE: We use withIndex + .some() because there's no index on userId
  // The by_artifact_active index narrows the search first
  const reviewers = await ctx.db
    .query("artifactReviewers")
    .withIndex("by_artifact_active", (q) =>
      q.eq("artifactId", artifact._id).eq("isDeleted", false)
    )
    .collect();

  const isReviewer = reviewers.some((r) => r.userId === userId);
  if (isReviewer) {
    return "can-comment";
  }

  throw new Error("No permission to comment on this artifact");
}

/**
 * Check if user can edit a comment.
 * Only the creator can edit their own comment.
 *
 * @param createdBy - The comment's creator
 * @param userId - The user attempting to edit
 * @returns true if user can edit
 */
export function canEditComment(
  createdBy: Id<"users">,
  userId: Id<"users">
): boolean {
  return createdBy === userId;
}

/**
 * Check if user can delete a comment.
 * Creator can delete their own comment.
 * Artifact owner can delete any comment (moderation).
 *
 * @param ctx - Query or Mutation context
 * @param comment - The comment document
 * @param userId - The user attempting to delete
 * @returns true if user can delete
 */
export async function canDeleteComment(
  ctx: QueryCtx | MutationCtx,
  comment: Doc<"comments">,
  userId: Id<"users">
): Promise<boolean> {
  // Creator can always delete their own
  if (comment.createdBy === userId) {
    return true;
  }

  // Check if user is artifact owner
  const version = await ctx.db.get(comment.versionId);
  if (!version) return false;

  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact) return false;

  return artifact.createdBy === userId;
}

/**
 * Check if user can edit a reply.
 * Only the creator can edit their own reply.
 *
 * @param createdBy - The reply's creator
 * @param userId - The user attempting to edit
 * @returns true if user can edit
 */
export function canEditReply(
  createdBy: Id<"users">,
  userId: Id<"users">
): boolean {
  return createdBy === userId;
}

/**
 * Check if user can delete a reply.
 * Creator can delete their own reply.
 * Artifact owner can delete any reply (moderation).
 *
 * @param ctx - Query or Mutation context
 * @param versionId - The artifact version (for owner lookup)
 * @param createdBy - The reply's creator
 * @param userId - The user attempting to delete
 * @returns true if user can delete
 */
export async function canDeleteReply(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"artifactVersions">,
  createdBy: Id<"users">,
  userId: Id<"users">
): Promise<boolean> {
  // Creator can always delete their own
  if (createdBy === userId) {
    return true;
  }

  // Check if user is artifact owner
  const version = await ctx.db.get(versionId);
  if (!version) return false;

  const artifact = await ctx.db.get(version.artifactId);
  if (!artifact) return false;

  return artifact.createdBy === userId;
}
