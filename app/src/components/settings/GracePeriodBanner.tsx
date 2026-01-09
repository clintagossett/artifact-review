"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useGracePeriod, formatTimeRemaining } from "@/hooks/useGracePeriod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Unlock, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Grace Period Banner
 *
 * Displays the current grace period status:
 * - Fresh (green): Within 15-minute grace period, shows countdown
 * - Stale (orange): Outside grace period, offers re-authentication
 */
export function GracePeriodBanner() {
  const { isWithinGracePeriod, timeRemaining, isLoading } = useGracePeriod();
  const sendReauthMagicLink = useAction(api.settings.sendReauthMagicLink);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendMagicLink = async () => {
    setIsSending(true);
    try {
      await sendReauthMagicLink();
      toast({
        title: "Magic link sent",
        description: "Check your email for a link to re-authenticate.",
      });
    } catch (error) {
      toast({
        title: "Failed to send magic link",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Loading state - show nothing or neutral state
  if (isLoading) {
    return null;
  }

  // Fresh state (green banner with countdown)
  if (isWithinGracePeriod) {
    return (
      <Alert className="bg-green-50 border-green-200 text-green-900 mb-6">
        <Unlock className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span className="font-medium">You recently signed in</span>
            <span className="text-sm text-green-700">
              Time remaining: {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            You can change your password without entering your current password.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Stale state (orange banner with re-auth option)
  return (
    <Alert className="bg-orange-50 border-orange-200 text-orange-900 mb-6">
      <Lock className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <p className="font-medium">Re-authentication required</p>
            <p className="text-sm text-orange-700 mt-1">
              For security, we need to verify your identity before changing your password.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSendMagicLink}
              disabled={isSending}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-orange-50 border-orange-300"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Magic Link"
              )}
            </Button>
            <span className="text-sm text-orange-700">
              Or enter your current password below:
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
