/**
 * Read Permission Helpers (Phase 2 - Step 1)
 * Task 00018 - Refine Single-File Artifact Upload and Versioning
 *
 * Centralized permission checking for artifact and version access.
 * Used by queries to enforce read permissions.
 */

import { QueryCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Permission levels for artifact access
 */
export type PermissionLevel = "owner" | "reviewer" | "public" | null;

/**
 * Check what permission level a user has for an artifact.
 *
 * Returns:
 * - "owner" if user is the artifact creator
 * - "reviewer" if user is an invited reviewer
 * - "public" if artifact has a valid shareToken (anyone can view)
 * - null if access is denied (artifact deleted or doesn't exist)
 */
export async function getArtifactPermission(
  ctx: QueryCtx,
  artifactId: Id<"artifacts">
): Promise<PermissionLevel> {
  // Get artifact
  const artifact = await ctx.db.get(artifactId);
  if (!artifact || artifact.isDeleted) {
    return null;
  }

  // Check if user is authenticated
  const userId = await getAuthUserId(ctx);

  // Owner check
  if (userId && artifact.creatorId === userId) {
    return "owner";
  }

  // Reviewer check
  if (userId) {
    const reviewer = await ctx.db
      .query("artifactReviewers")
      .withIndex("by_artifact_active", (q) =>
        q.eq("artifactId", artifactId).eq("isDeleted", false)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (reviewer) {
      return "reviewer";
    }
  }

  // Public access via shareToken (artifact exists and is not deleted)
  // Anyone with the shareToken can view
  return "public";
}

/**
 * Check if user can view an artifact (any permission level grants view access).
 */
export async function canViewArtifact(
  ctx: QueryCtx,
  artifactId: Id<"artifacts">
): Promise<boolean> {
  const permission = await getArtifactPermission(ctx, artifactId);
  return permission !== null;
}

/**
 * Check if user can view a specific version.
 * Currently same as artifact access (versions inherit artifact permissions).
 */
export async function canViewVersion(
  ctx: QueryCtx,
  versionId: Id<"artifactVersions">
): Promise<boolean> {
  const version = await ctx.db.get(versionId);
  if (!version || version.isDeleted) {
    return false;
  }
  return canViewArtifact(ctx, version.artifactId);
}

/**
 * Get artifact by share token with permission check.
 * Returns artifact if valid shareToken, null otherwise.
 */
export async function getArtifactByShareToken(
  ctx: QueryCtx,
  shareToken: string
): Promise<{
  artifact: Doc<"artifacts">;
  permission: PermissionLevel;
} | null> {
  const artifact = await ctx.db
    .query("artifacts")
    .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
    .first();

  if (!artifact || artifact.isDeleted) {
    return null;
  }

  const permission = await getArtifactPermission(ctx, artifact._id);
  if (!permission) {
    return null;
  }

  return { artifact, permission };
}
