"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { logger, LOG_TOPICS } from "@/lib/logger";
import { Mail } from "lucide-react";
import type { Id } from "@/../../convex/_generated/dataModel";

export interface InviteReviewerFormProps {
  artifactId: Id<"artifacts">;
  onInvited?: () => void;
}

/**
 * InviteReviewerForm - Email input with invite functionality
 */
export function InviteReviewerForm({
  artifactId,
  onInvited,
}: InviteReviewerFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const grant = useMutation(api.access.grant);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await grant({ artifactId, email: email.trim() });

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${email}.`,
      });

      logger.info(LOG_TOPICS.Artifact, "InviteReviewerForm", "Reviewer invited", {
        artifactId,
        email,
      });

      // Clear input
      setEmail("");

      // Callback
      onInvited?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        LOG_TOPICS.Artifact,
        "InviteReviewerForm",
        "Failed to invite reviewer",
        { error: errorMessage, artifactId, email }
      );

      // Parse error for user-friendly message
      let title = "Failed to invite";
      let description = "Could not send invitation. Please try again.";

      if (errorMessage.includes("already has access")) {
        title = "Already invited";
        description = "This user already has access to this artifact.";
      } else if (errorMessage.includes("already been invited")) {
        title = "Already invited";
        description = "This email has already been invited to this artifact.";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="reviewer-email" className="text-sm font-medium text-gray-700">
          Invite by Email
        </Label>
        <div className="mt-1.5 flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="reviewer-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Invite"}
          </Button>
        </div>
      </div>
    </form>
  );
}
