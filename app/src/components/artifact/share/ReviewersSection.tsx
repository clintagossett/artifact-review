import { ReviewerCard } from "./ReviewerCard";

interface Reviewer {
  _id: string;
  email: string;
  status: "pending" | "added" | "viewed";
  invitedAt: number;
  user?: {
    name?: string;
  } | null;
}

interface ReviewersSectionProps {
  reviewers: Reviewer[];
  onRemove: (id: string) => void;
  isRemovingId?: string | null;
}

export function ReviewersSection({ reviewers, onRemove, isRemovingId }: ReviewersSectionProps) {
  if (reviewers.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          People with Access (0)
        </h3>
        <p className="text-sm text-gray-500 text-center py-8">
          No reviewers yet. Invite someone to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        People with Access ({reviewers.length})
      </h3>
      <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
        {reviewers.map((reviewer) => (
          <ReviewerCard
            key={reviewer._id}
            reviewer={reviewer}
            onRemove={onRemove}
            isRemoving={isRemovingId === reviewer._id}
          />
        ))}
      </div>
    </div>
  );
}
