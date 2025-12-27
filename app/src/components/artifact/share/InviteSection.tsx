"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InviteSectionProps {
  onInvite: (email: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteSection({ onInvite, isLoading = false, error = null }: InviteSectionProps) {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setValidationError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setValidationError("Please enter a valid email address");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    try {
      await onInvite(email);
      setEmail("");
      setValidationError(null);
    } catch (err) {
      // Error handled by parent component via error prop
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e as any);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* Email Input with Icon */}
        <div className="flex-1 relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Invite Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Inviting...
            </>
          ) : (
            "Invite"
          )}
        </Button>
      </form>

      {/* Error Message */}
      {displayError && (
        <p className="text-sm text-red-600">{displayError}</p>
      )}
    </div>
  );
}
