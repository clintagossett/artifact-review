"use client";

import { useMutation } from "convex/react";
import { api } from "@/../../convex/_generated/api";
import { useReviewers } from "@/hooks/useReviewers";
import { ReviewerRow } from "./ReviewerRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { logger, LOG_TOPICS } from "@/lib/logger";
import type { Id } from "@/../../convex/_generated/dataModel";

export interface ReviewerListProps {
  artifactId: Id<"artifacts">;
}

/**
 * ReviewerList - Display and manage reviewers for an artifact
 */
export function ReviewerList({ artifactId }: ReviewerListProps) {
  const { reviewers, isLoading } = useReviewers(artifactId);
  const resend = useMutation(api.access.resend);
  const revoke = useMutation(api.access.revoke);

  const handleResend = async (accessId: Id<"artifactAccess">) => {
    try {
      await resend({ accessId });
      toast({
        title: "Invitation resent",
        description: "The invitation email has been sent again.",
      });
      logger.info(LOG_TOPICS.Artifact, "ReviewerList", "Invitation resent", {
        accessId,
        artifactId,
      });
    } catch (error) {
      logger.error(
        LOG_TOPICS.Artifact,
        "ReviewerList",
        "Failed to resend invitation",
        { error: error instanceof Error ? error.message : String(error), accessId }
      );
      toast({
        title: "Failed to resend",
        description: "Could not resend the invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (accessId: Id<"artifactAccess">) => {
    try {
      await revoke({ accessId });
      toast({
        title: "Reviewer removed",
        description: "The reviewer has been removed from this artifact.",
      });
      logger.info(LOG_TOPICS.Artifact, "ReviewerList", "Reviewer removed", {
        accessId,
        artifactId,
      });
    } catch (error) {
      logger.error(
        LOG_TOPICS.Artifact,
        "ReviewerList",
        "Failed to remove reviewer",
        { error: error instanceof Error ? error.message : String(error), accessId }
      );
      toast({
        title: "Failed to remove",
        description: "Could not remove the reviewer. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  // Empty state
  if (reviewers.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">
          No reviewers yet. Invite team members to review this artifact.
        </p>
      </div>
    );
  }

  // Reviewer list
  return (
    <div className="space-y-0">
      {reviewers.map((reviewer: any, index: number) => (
        <div key={reviewer.accessId}>
          <ReviewerRow
            reviewer={reviewer}
            onResend={handleResend}
            onRemove={handleRemove}
          />
          {index < reviewers.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
