/**
 * Hook to query current user's permission level for an artifact
 * Includes real-time subscription for permission changes
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type Permission = "owner" | "can-comment" | null;

/**
 * Query current user's permission level for an artifact
 *
 * Returns:
 * - "owner": User created the artifact
 * - "can-comment": User has active access record
 * - null: No access
 *
 * Note: This is a reactive query - changes trigger re-renders
 */
export function usePermission(artifactId: Id<"artifacts"> | undefined): Permission {
  const permission = useQuery(
    api.access.getPermission,
    artifactId ? { artifactId } : "skip"
  );

  return permission ?? null;
}
