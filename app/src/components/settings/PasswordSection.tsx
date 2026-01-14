"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useGracePeriod } from "@/hooks/useGracePeriod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GracePeriodBanner } from "./GracePeriodBanner";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Password Section
 *
 * Allows users to change their password with grace period awareness:
 * - Within grace period: Only new password + confirm
 * - Outside grace period: Current password + new password + confirm
 *
 * Password validation matches RegisterForm exactly.
 */
export function PasswordSection({ debugOverride }: { debugOverride?: "auto" | "fresh" | "stale" }) {
  const { isWithinGracePeriod } = useGracePeriod(debugOverride);
  const changePassword = useMutation(api.settings.changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Password requirements (same as RegisterForm)
  const passwordRequirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "Contains a number", met: /\d/.test(newPassword) },
    { label: "Contains a letter", met: /[a-zA-Z]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password requirements
    if (!allRequirementsMet) {
      setError("Password does not meet all requirements");
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate current password if outside grace period
    if (!isWithinGracePeriod && !currentPassword) {
      setError("Current password is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        currentPassword: isWithinGracePeriod ? undefined : currentPassword,
        newPassword,
      });

      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const message = err?.message || "Failed to change password";
      setError(message);
      toast({
        title: "Password change failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your password</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Grace Period Banner */}
        <GracePeriodBanner debugOverride={debugOverride} />

        {/* Password Change Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password (only when stale) */}
          {!isWithinGracePeriod && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required={!isWithinGracePeriod}
                  className="pl-10"
                  placeholder="Enter your current password"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="pl-10"
                placeholder="Create a strong password"
                disabled={isSubmitting}
              />
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-3">
                <PasswordStrengthIndicator password={newPassword} />
              </div>
            )}

            {/* Password Requirements Checklist (from RegisterForm pattern) */}
            {newPassword && (
              <div className="mt-3">
                <ul className="space-y-2" role="list">
                  {passwordRequirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs" role="listitem">
                      {req.met ? (
                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className={req.met ? "text-green-700" : "text-gray-500"}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10"
                placeholder="Re-enter your new password"
                disabled={isSubmitting}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Passwords do not match
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !allRequirementsMet || newPassword !== confirmPassword}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Changing password...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
