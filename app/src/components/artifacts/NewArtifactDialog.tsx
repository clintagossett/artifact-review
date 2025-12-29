"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadDropzone } from "./UploadDropzone";
import type { CreateArtifactData } from "@/hooks/useArtifactUpload";

export interface NewArtifactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateArtifact: (data: CreateArtifactData) => Promise<void>;
}

/**
 * Auto-suggest title from filename
 * Removes extension and formats: "my-file-name.html" → "My File Name"
 */
function suggestTitleFromFilename(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  // Replace underscores and hyphens with spaces
  const withSpaces = nameWithoutExt.replace(/[_-]/g, " ");

  // Capitalize first letter of each word
  return withSpaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function NewArtifactDialog({
  open,
  onOpenChange,
  onCreateArtifact,
}: NewArtifactDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-suggest title if title is empty
    if (!title) {
      setTitle(suggestTitleFromFilename(file.name));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateArtifact({
        file: selectedFile,
        title: title.trim(),
        description: description.trim() || undefined,
      });

      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create artifact:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  const isValid = selectedFile && title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <FolderPlus className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <DialogTitle>Create New Artifact</DialogTitle>
              <DialogDescription>
                Upload an HTML or Markdown file to start reviewing with your team.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Upload Section */}
          <div className="space-y-2">
            <Label>Upload File</Label>
            <UploadDropzone
              onFileSelect={handleFileSelect}
              onRemoveFile={handleRemoveFile}
              selectedFile={selectedFile}
              accept=".html,.htm,.md"
            />
          </div>

          {/* Artifact Name */}
          <div className="space-y-2">
            <Label htmlFor="artifact-name">
              Artifact Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="artifact-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., June Earnings by Region"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this artifact..."
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? "Creating..." : "Create Artifact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
