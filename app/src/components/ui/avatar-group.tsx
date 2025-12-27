import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface AvatarGroupProps {
  users: Array<{
    name?: string;
    image?: string;
  }>;
  max?: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Get initials from a name
 */
function getInitials(name?: string): string {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * AvatarGroup - Display stacked avatars with overflow count
 */
export function AvatarGroup({ users, max = 3, size = "md" }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const overflowCount = Math.max(0, users.length - max);

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center -space-x-2">
      {displayUsers.map((user, index) => (
        <Avatar key={index} className={cn(sizeClasses[size], "border-2 border-white")}>
          {user.image && <AvatarImage src={user.image} alt={user.name} />}
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      ))}

      {overflowCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-white bg-gray-200 text-gray-600 font-medium",
            sizeClasses[size]
          )}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
