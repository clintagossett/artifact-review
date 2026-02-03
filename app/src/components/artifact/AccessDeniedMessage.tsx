"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AccessDeniedMessageProps {
  artifactTitle?: string;
}

export function AccessDeniedMessage({ artifactTitle }: AccessDeniedMessageProps) {
  const router = useRouter();

  return (
    <div className="max-w-md mx-auto mt-16 p-8">
      <Card className="text-center">
        <CardContent className="pt-8 pb-8">
          <Lock className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 mt-4">
            {"You don't have access"}
          </h2>
          {artifactTitle && (
            <p className="text-sm text-gray-600 mt-2">
              {`to "${artifactTitle}"`}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Contact the artifact owner to request access to this artifact.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="mt-6"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
