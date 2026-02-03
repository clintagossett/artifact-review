"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GradientLogo } from "@/components/shared/GradientLogo";
import { IconInput } from "@/components/shared/IconInput";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { AuthMethodToggle } from "./AuthMethodToggle";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Mail, User, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

interface RegisterFormProps {
  onSuccess: () => void;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [authMethod, setAuthMethod] = useState<"password" | "magic-link">("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Wait for auth state to propagate after password signup before redirecting
  useEffect(() => {
    if (signupComplete && isAuthenticated) {
      onSuccessRef.current();
    }
  }, [signupComplete, isAuthenticated]);

  const passwordRequirements: PasswordRequirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains a letter", met: /[a-zA-Z]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate name
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (authMethod === "magic-link") {
      // Magic link signup flow
      setIsLoading(true);
      try {
        await signIn("resend", { email, redirectTo: returnTo || "/dashboard" });
        setEmailSent(true);
        // Don't call onSuccess - user is not authenticated yet
      } catch {
        setError("Failed to send magic link");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Password signup flow
      // Validate passwords match
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // Validate password requirements
      if (!allRequirementsMet) {
        setError("Password does not meet all requirements");
        return;
      }

      setIsLoading(true);

      try {
        await signIn("password", {
          email,
          password,
          name,
          flow: "signUp",
        });
        // Signal that signup is complete - useEffect will redirect once auth state propagates
        setSignupComplete(true);
      } catch (err) {
        console.error("Registration error:", err);
        setError("Registration failed. Email may already be in use.");
        setIsLoading(false);
      }
      // Note: Don't setIsLoading(false) on success - keep loading until redirect
    }
  };

  // Show success message after magic link sent
  if (emailSent) {
    return (
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <GradientLogo icon={Mail} />
        </div>

        {/* Success Message */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
          <p className="text-gray-600">
            We sent a sign-up link to <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
          <p className="text-sm text-blue-900">
            Click the link in your email to complete your registration. The link expires in 10 minutes.
          </p>
          <p className="text-sm text-blue-800">
            {"Didn't receive it? Check your spam folder or request a new link."}
          </p>
        </div>

        {/* Back to Login Link */}
        <div className="text-center">
          <Link
            href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition"
          >
            Return to Sign In
          </Link>
        </div>

        {/* Terms Footer */}
        <p className="text-center text-sm text-gray-500">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Logo */}
      <div className="flex justify-center">
        <GradientLogo icon={UserPlus} />
      </div>

      {/* Headings */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-600">Get started with Artifact Review today</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Auth Method Toggle */}
        <AuthMethodToggle value={authMethod} onChange={setAuthMethod} />

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Name Input */}
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <IconInput
            id="name"
            type="text"
            icon={User}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={isLoading}
          />
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        {/* Password Fields (only in password mode) */}
        {authMethod === "password" && (
          <>
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isLoading}
              />

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3">
                  <PasswordStrengthIndicator password={password} />
                </div>
              )}

              {/* Password Requirements */}
              {password && (
                <div className="mt-3 space-y-2">
                  {passwordRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Passwords do not match
                </p>
              )}
            </div>
          </>
        )}

        {/* Magic Link Info (only in magic link mode) */}
        {authMethod === "magic-link" && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">
                  Passwordless sign up
                </p>
                <p className="text-xs text-purple-700">
                  We&apos;ll email you a secure link to verify your account and sign in instantly—no password needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {authMethod === "magic-link" ? "Sending..." : "Creating account..."}
            </>
          ) : authMethod === "magic-link" ? (
            <>
              Send Magic Link
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>

      {/* Terms Footer */}
      <p className="text-center text-sm text-gray-500">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
