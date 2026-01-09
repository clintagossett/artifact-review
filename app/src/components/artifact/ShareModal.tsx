"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InviteSection } from "./share/InviteSection";
import { ReviewersSection } from "./share/ReviewersSection";
import { PermissionsInfoBox } from "./share/PermissionsInfoBox";

interface Reviewer {
  _id: string;
  email: string;
  status: "pending" | "added" | "viewed";
  invitedAt: number;
  user?: {
    name?: string;
  } | null;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    _id: Id<"artifacts">;
    name: string;
    shareToken: string;
  };
  // For mock mode - backward compatible
  initialReviewers?: Reviewer[];
}

export function ShareModal({ isOpen, onClose, artifact, initialReviewers }: ShareModalProps) {
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Query reviewers from backend - skip when modal is closed
  const backendReviewers = useQuery(
    api.access.listReviewers,
    isOpen ? { artifactId: artifact._id } : "skip"
  );

  // Map access.listReviewers response to expected Reviewer shape
  const reviewers = backendReviewers
    ? backendReviewers.map((access) => ({
      _id: access.accessId,
      email: access.email,
      status: access.status,
      invitedAt: access.lastSentAt, // Use lastSentAt as closest to invitedAt
      user: { name: access.displayName !== access.email ? access.displayName : undefined },
    }))
    : initialReviewers ?? [];

  // Mutations
  const inviteReviewer = useMutation(api.access.grant);
  const removeReviewer = useMutation(api.access.revoke);

  // Loading states
  const isLoadingReviewers = backendReviewers === undefined && !initialReviewers;
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (email: string) => {
    setIsInviting(true);
    setInviteError(null);

    try {
      await inviteReviewer({
        artifactId: artifact._id,
        email,
      });

      toast({
        title: "Reviewer invited",
        description: `${email} has been invited to review.`,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send invitation";
      setInviteError(errorMessage);

      toast({
        variant: "destructive",
        title: "Failed to invite",
        description: errorMessage,
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);

    try {
      await removeReviewer({
        accessId: id as Id<"artifactAccess">,
      });

      toast({
        title: "Reviewer removed",
        description: "The reviewer has been removed from this artifact.",
      });
    } catch (error: any) {
      console.error("Failed to remove reviewer:", error);

      toast({
        variant: "destructive",
        title: "Failed to remove",
        description: error.message || "Could not remove reviewer.",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Artifact for Review</DialogTitle>
          <DialogDescription>
            Invite teammates to view and comment on this artifact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Section */}
          <InviteSection
            onInvite={handleInvite}
            isLoading={isInviting}
            error={inviteError}
          />

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Reviewers Section */}
          <ReviewersSection
            reviewers={reviewers}
            onRemove={handleRemove}
            isRemovingId={removingId}
          />

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Permissions Info Box */}
          <PermissionsInfoBox />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
