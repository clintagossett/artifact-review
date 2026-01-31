"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type VersionStatus = "uploading" | "processing" | "ready" | "error";

export interface UseVersionStatusReturn {
  status: VersionStatus | undefined;
  errorMessage: string | undefined;
  isLoading: boolean;
  isReady: boolean;
  isError: boolean;
}

/**
 * Subscribe to version processing status
 * Returns real-time status updates from Convex
 *
 * Task 00049 - Subtask 02: Frontend Status Tracking
 *
 * @param versionId - The version to track (null to skip subscription)
 */
export function useVersionStatus(
  versionId: Id<"artifactVersions"> | null
): UseVersionStatusReturn {
  const result = useQuery(
    api.artifacts.getVersionStatus,
    versionId ? { versionId } : "skip"
  );

  // Handle loading state
  if (result === undefined) {
    return {
      status: undefined,
      errorMessage: undefined,
      isLoading: true,
      isReady: false,
      isError: false,
    };
  }

  // Handle not found
  if (result === null) {
    return {
      status: undefined,
      errorMessage: undefined,
      isLoading: false,
      isReady: false,
      isError: false,
    };
  }

  return {
    status: result.status,
    errorMessage: result.errorMessage,
    isLoading: false,
    isReady: result.status === "ready",
    isError: result.status === "error",
  };
}
