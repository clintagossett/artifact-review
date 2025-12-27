import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MultiPageNavigationProps {
  currentPage: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export function MultiPageNavigation({
  currentPage,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: MultiPageNavigationProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-gray-50">
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        disabled={!canGoBack}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onForward}
        disabled={!canGoForward}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <div className="flex-1 px-3 py-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md">
        {currentPage}
      </div>
    </div>
  );
}
