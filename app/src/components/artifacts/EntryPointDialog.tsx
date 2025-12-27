"use client";

import { useState, useEffect } from "react";
import { FileText, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface EntryPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zipFileName: string;
  htmlFiles: string[];
  onSelect: (entryPoint: string) => Promise<void>;
}

/**
 * Auto-detect entry point from HTML files list
 * Priority: index.html > main.html > first file
 */
function detectEntryPoint(htmlFiles: string[]): string {
  // Case-insensitive search for index.html
  const indexFile = htmlFiles.find((file) =>
    file.toLowerCase().endsWith("index.html")
  );
  if (indexFile) return indexFile;

  // Case-insensitive search for main.html
  const mainFile = htmlFiles.find((file) =>
    file.toLowerCase().endsWith("main.html")
  );
  if (mainFile) return mainFile;

  // Default to first file
  return htmlFiles[0] || "";
}

export function EntryPointDialog({
  open,
  onOpenChange,
  zipFileName,
  htmlFiles,
  onSelect,
}: EntryPointDialogProps) {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect entry point when dialog opens or files change
  useEffect(() => {
    if (open && htmlFiles.length > 0) {
      setSelectedFile(detectEntryPoint(htmlFiles));
    }
  }, [open, htmlFiles]);

  const handleConfirm = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    try {
      await onSelect(selectedFile);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to select entry point:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Entry Point</DialogTitle>
          <DialogDescription>
            Choose the main HTML file for <strong>{zipFileName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Found {htmlFiles.length} HTML {htmlFiles.length === 1 ? "file" : "files"}:
          </p>

          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-2">
              {htmlFiles.map((file) => (
                <button
                  key={file}
                  onClick={() => setSelectedFile(file)}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                    "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500",
                    {
                      "border-purple-500 bg-purple-50": selectedFile === file,
                      "border-gray-200": selectedFile !== file,
                    }
                  )}
                >
                  <FileText
                    className={cn("h-5 w-5", {
                      "text-purple-600": selectedFile === file,
                      "text-gray-400": selectedFile !== file,
                    })}
                  />
                  <span
                    className={cn("flex-1 text-left text-sm font-medium", {
                      "text-purple-900": selectedFile === file,
                      "text-gray-700": selectedFile !== file,
                    })}
                  >
                    {file}
                  </span>
                  {selectedFile === file && (
                    <CheckCircle2 className="h-5 w-5 text-purple-600 lucide-check-circle-2" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>

          {selectedFile && (
            <p className="text-sm text-gray-600">
              Selected: <strong className="text-gray-900">{selectedFile}</strong>
            </p>
          )}
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
            onClick={handleConfirm}
            disabled={!selectedFile || isSubmitting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? "Confirming..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
