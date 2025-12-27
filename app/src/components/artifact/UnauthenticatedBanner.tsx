"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnauthenticatedBannerProps {
  shareToken: string;
}

export function UnauthenticatedBanner({ shareToken }: UnauthenticatedBannerProps) {
  const handleSignIn = () => {
    const returnTo = `/a/${shareToken}`;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <Lock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-900">
            Sign in to view and comment
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            You've been invited to review this artifact. Sign in to continue.
          </p>
          <Button
            onClick={handleSignIn}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Sign In to Review
          </Button>
        </div>
      </div>
    </div>
  );
}
