"use client";

import { Loader2, AlertCircle, Upload, FileArchive } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VersionStatus } from "@/hooks/useVersionStatus";

interface UploadStatusIndicatorProps {
  status: VersionStatus;
  errorMessage?: string;
  onRetry?: () => void;
}

/**
 * Visual status indicator for artifact upload and processing
 * Task 00049 - Subtask 02: Frontend Status Tracking
 *
 * Shows different states:
 * - uploading: Card with spinner and upload icon
 * - processing: Card with spinner and processing message
 * - error: Alert with error message and optional retry button
 * - ready: No indicator (returns null)
 *
 * Always includes data-version-status attribute for E2E testing.
 */
export function UploadStatusIndicator({
  status,
  errorMessage,
  onRetry,
}: UploadStatusIndicatorProps) {
  // Ready state - no indicator needed
  if (status === "ready") {
    return null;
  }

  // Uploading state
  if (status === "uploading") {
    return (
      <Card
        className="border-blue-200 bg-blue-50 shadow-lg"
        data-version-status="uploading"
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Upload className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-blue-900">Uploading artifact...</p>
            <p className="text-sm text-blue-700">Sending file to server</p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  // Processing state
  if (status === "processing") {
    return (
      <Card
        className="border-purple-200 bg-purple-50 shadow-lg"
        data-version-status="processing"
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
            <FileArchive className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-purple-900">Processing ZIP contents...</p>
            <p className="text-sm text-purple-700">Extracting and validating files</p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <Alert variant="destructive" data-version-status="error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Upload Failed</AlertTitle>
        <AlertDescription className="mt-2">
          {errorMessage || "An error occurred during processing."}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              Retry Upload
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
