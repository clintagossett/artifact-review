"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Mail, Trash2 } from "lucide-react";
import type { Id } from "@/../../convex/_generated/dataModel";

export interface ReviewerRowProps {
  reviewer: {
    displayName: string;
    email: string;
    status: "pending" | "accepted";
    accessId: Id<"artifactAccess">;
    sendCount: number;
    lastSentAt: number;
  };
  onResend: (accessId: Id<"artifactAccess">) => void;
  onRemove: (accessId: Id<"artifactAccess">) => void;
}

/**
 * ReviewerRow - Display single reviewer with status and actions
 */
export function ReviewerRow({ reviewer, onResend, onRemove }: ReviewerRowProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Get initials for avatar
  const getInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Status badge configuration
  const statusConfig = {
    pending: {
      label: "Pending",
      variant: "secondary" as const,
      ariaLabel: "Invitation pending - user has not signed up yet",
    },
    accepted: {
      label: "Added",
      variant: "default" as const,
      ariaLabel: "User has accepted invitation",
    },
  };

  const config = statusConfig[reviewer.status];

  const handleRemoveConfirm = () => {
    setShowRemoveDialog(false);
    onRemove(reviewer.accessId);
  };

  return (
    <>
      <div className="flex items-center gap-3 py-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gray-200 text-gray-700">
            {getInitials(reviewer.displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Name/Email */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {reviewer.displayName}
          </div>
          <div className="text-xs text-gray-500 truncate">{reviewer.email}</div>
        </div>

        {/* Status Badge */}
        <Badge variant={config.variant} aria-label={config.ariaLabel}>
          {config.label}
        </Badge>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label={`Actions for ${reviewer.displayName}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {reviewer.status === "pending" && (
              <DropdownMenuItem onClick={() => onResend(reviewer.accessId)}>
                <Mail className="mr-2 h-4 w-4" />
                Resend Invitation
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setShowRemoveDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Reviewer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {reviewer.displayName} from this
              artifact? They will no longer be able to view or comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
