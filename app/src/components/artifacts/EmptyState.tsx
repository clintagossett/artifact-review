import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  onCreateFirst: () => void;
}

/**
 * EmptyState - Show when user has no artifacts
 */
export function EmptyState({ onCreateFirst }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {/* Large upload icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
        <Upload className="h-8 w-8 text-purple-600" />
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-2xl font-semibold text-gray-900">
        Create your first artifact
      </h2>

      {/* Description */}
      <p className="mb-8 max-w-md text-gray-600">
        Upload HTML, Markdown, or ZIP files to start reviewing with your team.
      </p>

      {/* CTA Button */}
      <Button
        onClick={onCreateFirst}
        className="bg-purple-600 hover:bg-purple-700"
      >
        Create Artifact
      </Button>
    </div>
  );
}
