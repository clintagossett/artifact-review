"use client";

import { useState, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface CreateArtifactData {
  file: File;
  name: string;
  description?: string;
  entryPoint?: string; // For ZIP files
}

export interface UploadResult {
  artifactId: Id<"artifacts">;
  versionId: Id<"artifactVersions">;
  number: number;
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

  const createArtifact = useAction(api.artifacts.create);
  // ZIP upload functions (Task 00019)
  const createArtifactWithZip = useMutation(api.zipUpload.createArtifactWithZip);
  const triggerZipProcessing = useAction(api.zipUpload.triggerZipProcessing);

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
      const { file, name, description, entryPoint } = data;

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
            name,
            description,
            fileType,
            content,  // Unified field for Phase 1
            originalFileName: file.name,
          });

          setUploadProgress(100);
          setIsUploading(false);

          return result;
        }

        // Handle ZIP files (Task 00019)
        if (fileType === "zip") {
          setUploadProgress(20);

          // Step 1: Get upload URL and create artifact/version records
          const { uploadUrl, artifactId, versionId, shareToken } =
            await createArtifactWithZip({
              name,
              description,
              size: file.size,
              entryPoint,
            });

          setUploadProgress(40);

          // Step 2: Upload file to storage URL
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/zip" },
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload ZIP file to storage");
          }

          const { storageId } = await uploadResponse.json();
          setUploadProgress(70);

          // Step 3: Trigger ZIP processing
          await triggerZipProcessing({ versionId, storageId });

          setUploadProgress(100);
          setIsUploading(false);

          return {
            artifactId,
            versionId,
            number: 1,
            shareToken,
          };
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
    [createArtifact, createArtifactWithZip, triggerZipProcessing]
  );

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    error,
    reset,
  };
}
