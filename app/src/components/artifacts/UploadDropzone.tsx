"use client";

import { useState, useRef, DragEvent, ChangeEvent, KeyboardEvent } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  onRemoveFile?: () => void;
  accept?: string;
  maxSize?: number;
  selectedFile?: File | null;
  error?: string | null;
  isUploading?: boolean;
  className?: string;
}

const DEFAULT_ACCEPT = ".html,.htm,.md,.zip";
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * File size limits per file type
 */
const FILE_SIZE_LIMITS: Record<string, number> = {
  html: 5 * 1024 * 1024,      // 5MB
  htm: 5 * 1024 * 1024,       // 5MB
  md: 1 * 1024 * 1024,        // 1MB
  zip: 100 * 1024 * 1024,     // 100MB
};

/**
 * Validate file against accept pattern and size limits
 */
function validateFile(
  file: File,
  accept: string,
  maxSize: number
): { valid: boolean; error?: string } {
  // Check file extension
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const acceptedExtensions = accept
    .split(",")
    .map((ext) => ext.trim().replace(".", ""));

  if (!acceptedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Supports ${accept}`,
    };
  }

  // Check size limit based on file type
  const typeMaxSize = FILE_SIZE_LIMITS[extension] || maxSize;
  if (file.size > typeMaxSize) {
    const sizeMB = (typeMaxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File too large. Maximum size for .${extension} files is ${sizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function UploadDropzone({
  onFileSelect,
  onRemoveFile,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  selectedFile = null,
  error = null,
  isUploading = false,
  className,
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayError = error || internalError;

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setInternalError(null);

    const validation = validateFile(file, accept, maxSize);
    if (!validation.valid) {
      setInternalError(validation.error || "Invalid file");
      return;
    }

    onFileSelect(file);
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !isUploading) {
      handleChooseFileClick();
    }
  };

  const handleRemove = () => {
    setInternalError(null);
    onRemoveFile?.();
  };

  // Determine visual state
  const hasError = Boolean(displayError);
  const hasFile = Boolean(selectedFile);

  return (
    <div className={cn("w-full", className)}>
      <div
        role="button"
        aria-label="Drop zone for file upload"
        aria-disabled={isUploading}
        tabIndex={isUploading ? -1 : 0}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200",
          "flex flex-col items-center justify-center p-12",
          "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
          {
            // Default state
            "border-gray-300 bg-white hover:border-gray-400":
              !isDragActive && !hasError && !hasFile && !isUploading,
            // Drag active state
            "border-purple-500 bg-purple-50": isDragActive && !isUploading,
            // Error state
            "border-red-500 bg-red-50": hasError,
            // Uploading state
            "opacity-60 cursor-not-allowed": isUploading,
            // File selected state (green border)
            "border-green-500 bg-green-50": hasFile && !hasError && !isUploading,
          }
        )}
      >
        {/* Hidden file input */}
        <label htmlFor="file-upload" className="sr-only">
          Upload artifact file
        </label>
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={isUploading}
          className="hidden"
        />

        {/* Upload icon or file selected state */}
        {hasFile && selectedFile ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center justify-between w-full max-w-md">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-2">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">
                    {selectedFile.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
              {onRemoveFile && !isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  aria-label="Remove file"
                  className="text-gray-600 hover:text-red-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        ) : isUploading ? (
          <>
            <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-4 mb-4">
              <Upload className="h-8 w-8 text-white animate-pulse" />
            </div>
            <p className="text-lg font-medium text-gray-700">Uploading...</p>
          </>
        ) : hasError ? (
          <>
            <div className="rounded-full bg-red-100 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-lg font-medium text-red-700">{displayError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleChooseFileClick}
              className="mt-4"
            >
              Try Again
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-4 mb-4">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <p className="text-lg font-medium text-gray-900">
              Drop your files here
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Supports .html, .md, .zip files
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleChooseFileClick}
              className="mt-4"
            >
              Choose File
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
