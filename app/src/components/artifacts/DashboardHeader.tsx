"use client";

import { FileText, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthActions } from "@convex-dev/auth/react";

export interface DashboardHeaderProps {
  onUploadClick: () => void;
  userEmail?: string;
  userName?: string;
}

/**
 * DashboardHeader - Top navigation with branding, actions, and user menu
 */
export function DashboardHeader({
  onUploadClick,
  userEmail,
  userName,
}: DashboardHeaderProps) {
  const { signOut } = useAuthActions();

  return (
    <header className="border-b bg-white px-4 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900">
            Artifact Review
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Upload Button */}
          <Button
            size="sm"
            onClick={onUploadClick}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Upload className="mr-1 h-4 w-4" />
            Upload
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {userName || "User"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {userEmail || ""}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
