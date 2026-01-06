"use client";

import { FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface UploadProgressProps {
  fileName: string;
  progress: number; // 0-100
  size?: number;
  className?: string;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function UploadProgress({
  fileName,
  progress,
  size,
  className,
}: UploadProgressProps) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* File info */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-2">
          <FileText className="h-5 w-5 text-white lucide-file-text" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{fileName}</p>
          {size !== undefined && (
            <p className="text-sm text-gray-600">{formatFileSize(size)}</p>
          )}
        </div>
        <div className="text-sm font-medium text-purple-600">{progress}%</div>
      </div>

      {/* Progress bar */}
      <Progress value={progress} max={100} className="h-2" aria-label="Upload progress" />
    </div>
  );
}
