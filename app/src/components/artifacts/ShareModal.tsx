"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Check, Info } from "lucide-react";
import type { Id } from "@/../../convex/_generated/dataModel";

export interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: {
    _id: Id<"artifacts">;
    title: string;
    shareToken: string;
  };
}

/**
 * ShareModal - Share artifact and manage permissions
 */
export function ShareModal({ open, onOpenChange, artifact }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Generate share URL
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/a/${artifact.shareToken}`
      : `/a/${artifact.shareToken}`;

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Share &quot;{artifact.title}&quot;</DialogTitle>
          <DialogDescription>
            Share this artifact with your team or stakeholders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share Link Section */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Share Link
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={shareUrl}
                  readOnly
                  className="pl-9"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
              <Button
                onClick={handleCopy}
                variant={copied ? "default" : "outline"}
                className={copied ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  "Copy"
                )}
              </Button>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>Anyone with this link can view this artifact.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
