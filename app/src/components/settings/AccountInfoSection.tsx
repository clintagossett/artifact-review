"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Account Information Section
 *
 * Displays and allows editing of:
 * - Email (read-only, disabled)
 * - Name (editable inline)
 */
export function AccountInfoSection() {
  const user = useQuery(api.users.getCurrentUser);
  const updateName = useMutation(api.users.updateName);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Sync name with user data when it loads or when exiting edit mode
  if (user && !isEditing && name !== (user.name ?? "")) {
    setName(user.name ?? "");
  }

  const handleEdit = () => {
    if (user) {
      setName(user.name ?? "");
      setIsEditing(true);
      setError("");
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name ?? "");
    }
    setIsEditing(false);
    setError("");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await updateName({ name: name.trim() });
      toast({
        title: "Name updated",
        description: "Your name has been successfully updated.",
      });
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update name. Please try again.");
      toast({
        title: "Update failed",
        description: "Failed to update your name. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Manage your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Manage your account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="bg-gray-50 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500">
            Email cannot be changed. Contact support if you need to update your email.
          </p>
        </div>

        {/* Name (editable) */}
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <div className="flex gap-2">
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              className={!isEditing ? "bg-gray-50" : ""}
            />
            {!isEditing ? (
              <Button
                onClick={handleEdit}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                <Pencil className="w-4 h-4" />
                <span className="sr-only">Edit</span>
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="icon"
                  className="flex-shrink-0"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span className="sr-only">Save</span>
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Cancel</span>
                </Button>
              </>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
