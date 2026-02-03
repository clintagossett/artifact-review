"use client";

import { Lock, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface UnauthenticatedBannerProps {
  shareToken: string;
}

export function UnauthenticatedBanner({ shareToken }: UnauthenticatedBannerProps) {
  const router = useRouter();
  const returnTo = `/a/${shareToken}`;

  const handleSignIn = () => {
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleSignUp = () => {
    router.push(`/register?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden max-w-lg mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Private Artifact</h2>
        <p className="text-blue-100">
          You&apos;ve been invited to review this artifact. Please sign in or create an account to view and participate.
        </p>
      </div>

      <div className="p-8 space-y-4 bg-gray-50/50">
        <Button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-2 h-12 text-base font-semibold bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
        >
          <LogIn className="h-5 w-5" />
          Sign In to Review
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">New to Artifact Review?</span>
          </div>
        </div>

        <Button
          onClick={handleSignUp}
          className="w-full flex items-center justify-center gap-2 h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
        >
          <UserPlus className="h-5 w-5" />
          Create Free Account
        </Button>
      </div>

      <div className="px-8 py-4 bg-gray-100 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Secure, collaborative artifact reviews for your team.
        </p>
      </div>
    </div>
  );
}
