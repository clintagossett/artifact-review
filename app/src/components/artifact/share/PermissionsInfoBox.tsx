import { Info } from "lucide-react";

export function PermissionsInfoBox() {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Reviewer Access
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Invited reviewers can view the artifact and add comments.
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Reviewers cannot edit the artifact or invite others.
          </p>
        </div>
      </div>
    </div>
  );
}
