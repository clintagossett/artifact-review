import { X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReviewerCardProps {
  reviewer: {
    _id: string;
    email: string;
    status: "pending" | "accepted";
    user?: {
      name?: string;
    } | null;
  };
  onRemove: (id: string) => void;
  isRemoving?: boolean;
}

// Helper function to get initials from name or email
function getInitials(name?: string, email?: string): string {
  if (name) {
    return name.charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "?";
}

// Helper function to get avatar gradient color based on email hash
function getAvatarGradient(email: string): string {
  // Simple hash function to get consistent color
  const hash = email.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const gradients = [
    "bg-gradient-to-br from-blue-500 to-blue-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-pink-500 to-pink-600",
    "bg-gradient-to-br from-green-500 to-green-600",
    "bg-gradient-to-br from-yellow-500 to-yellow-600",
    "bg-gradient-to-br from-red-500 to-red-600",
  ];

  return gradients[Math.abs(hash) % gradients.length];
}

export function ReviewerCard({ reviewer, onRemove, isRemoving = false }: ReviewerCardProps) {
  const displayName = reviewer.user?.name || reviewer.email;
  const initials = getInitials(reviewer.user?.name, reviewer.email);
  const gradientClass = getAvatarGradient(reviewer.email);

  return (
    <div className="bg-gray-50 hover:bg-gray-100 rounded-md p-3 transition-colors flex items-center gap-3">
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarFallback className={`${gradientClass} text-white`}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name and Email */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {displayName}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {reviewer.email}
        </div>
      </div>

      {/* Status Badge */}
      <Badge
        className={
          reviewer.status === "pending"
            ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
            : "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
        }
      >
        {reviewer.status === "pending" ? "Pending" : "Accepted"}
      </Badge>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(reviewer._id)}
        disabled={isRemoving}
        aria-label="Remove reviewer"
        className="text-gray-400 hover:text-gray-600 h-8 w-8"
      >
        {isRemoving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
