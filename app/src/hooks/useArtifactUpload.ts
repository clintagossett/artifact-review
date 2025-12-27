"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface CreateArtifactData {
  file: File;
  title: string;
  description?: string;
  entryPoint?: string; // For ZIP files
}

export interface UploadResult {
  artifactId: Id<"artifacts">;
  versionId: Id<"artifactVersions">;
  versionNumber: number;
  shareToken: string;
}

export interface UseArtifactUploadReturn {
  uploadFile: (data: CreateArtifactData) => Promise<UploadResult>;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Hook for uploading artifacts (HTML, Markdown, or ZIP files)
 */
export function useArtifactUpload(): UseArtifactUploadReturn {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createArtifact = useMutation(api.artifacts.create);
  const createArtifactWithZip = useMutation(api.zipUpload.createArtifactWithZip);
  const triggerZipProcessing = useMutation(api.zipUpload.triggerZipProcessing);

  const reset = useCallback(() => {
    setUploadProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result as string);
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  };

  const uploadFile = useCallback(
    async (data: CreateArtifactData): Promise<UploadResult> => {
      const { file, title, description, entryPoint } = data;

      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        // Determine file type from extension
        const extension = file.name.split(".").pop()?.toLowerCase();
        let fileType: "html" | "markdown" | "zip";

        if (extension === "html" || extension === "htm") {
          fileType = "html";
        } else if (extension === "md") {
          fileType = "markdown";
        } else if (extension === "zip") {
          fileType = "zip";
        } else {
          throw new Error(`Unsupported file type: .${extension}`);
        }

        // Simulate progress for reading file
        setUploadProgress(10);

        // Handle HTML and Markdown files - read content
        if (fileType === "html" || fileType === "markdown") {
          const content = await readFileAsText(file);
          setUploadProgress(50);

          const result = await createArtifact({
            title,
            description,
            fileType,
            ...(fileType === "html"
              ? { htmlContent: content }
              : { markdownContent: content }),
            fileSize: file.size,
          });

          setUploadProgress(100);
          setIsUploading(false);

          return result;
        }

        // Handle ZIP files
        if (fileType === "zip") {
          setUploadProgress(30);

          const result = await createArtifact({
            title,
            description,
            fileType: "zip",
            entryPoint,
            fileSize: file.size,
          });

          setUploadProgress(100);
          setIsUploading(false);

          return result;
        }

        throw new Error("Unsupported file type");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        setIsUploading(false);
        setUploadProgress(0);
        throw err;
      }
    },
    [createArtifact]
  );

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    error,
    reset,
  };
}
