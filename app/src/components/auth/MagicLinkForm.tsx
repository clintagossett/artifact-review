"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger, LOG_TOPICS } from "@/lib/logger";

interface MagicLinkFormProps {
  onSuccess: () => void;
}

export function MagicLinkForm({ onSuccess }: MagicLinkFormProps) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Mask email for logging (show first 2 chars and domain)
    const maskedEmail = email.replace(/(.{2}).*(@.*)/, "$1***$2");

    logger.info(LOG_TOPICS.Auth, "MagicLinkForm", "Magic link requested", {
      email: maskedEmail,
    });

    try {
      await signIn("resend", { email });
      setEmailSent(true);
      logger.info(LOG_TOPICS.Auth, "MagicLinkForm", "Magic link sent successfully", {
        email: maskedEmail,
      });
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error(LOG_TOPICS.Auth, "MagicLinkForm", "Failed to send magic link", {
        email: maskedEmail,
        error: errorMessage,
      });
      setError("Failed to send magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We sent a sign-in link to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the link in your email to sign in. The link expires in 10 minutes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Sign in with Email</CardTitle>
        <CardDescription>
          We&apos;ll send you a magic link to sign in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="magic-link-email">Email</Label>
            <Input
              id="magic-link-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
