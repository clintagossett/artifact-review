"use client";

import { Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ShareLinkUnavailable() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
          <Link2Off className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Link Unavailable
        </h1>
        <p className="text-gray-600 mb-6">
          This share link is no longer active or the artifact has been removed.
          If you believe this is an error, please contact the artifact owner.
        </p>
        <Button
          onClick={() => router.push("/")}
          variant="outline"
        >
          Go to Home
        </Button>
      </div>
    </div>
  );
}
