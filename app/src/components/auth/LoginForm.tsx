"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GradientLogo } from "@/components/shared/GradientLogo";
import { IconInput } from "@/components/shared/IconInput";
import { AuthMethodToggle } from "./AuthMethodToggle";
import { LogIn, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn } = useAuthActions();
  const [authMethod, setAuthMethod] = useState<"password" | "magic-link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  // Email validation regex - requires something@domain.ext format
  const validateEmail = (emailValue: string): boolean => {
    // Check for basic email format: something@domain.ext
    // Must have @ symbol, text before and after it, and a domain extension
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    // Clear error when user starts typing
    if (emailError && validateEmail(newEmail)) {
      setEmailError("");
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (email && !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const isFormValid = (): boolean => {
    return validateEmail(email) && (authMethod === "magic-link" || password.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email before submission
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      setEmailTouched(true);
      return;
    }

    setIsLoading(true);

    try {
      if (authMethod === "magic-link") {
        await signIn("resend", { email, redirectTo: "/dashboard" });
        setEmailSent(true);
        // Don't call onSuccess - user is not authenticated yet
      } else {
        await signIn("password", {
          email,
          password,
          flow: "signIn",
        });
        onSuccess();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
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
            We sent a sign-in link to <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
          <p className="text-sm text-blue-900">
            Click the link in your email to sign in. The link expires in 10 minutes.
          </p>
          <p className="text-sm text-blue-800">
            {"Didn't receive it? Check your spam folder or request a new link."}
          </p>
        </div>

        {/* Back to Login Link */}
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition"
          >
            Return to Sign In
          </Link>
        </div>

        {/* Terms Footer */}
        <p className="text-center text-sm text-gray-500">
          By signing in, you agree to our{" "}
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
        <GradientLogo icon={LogIn} />
      </div>

      {/* Headings */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-600">Sign in to your Artifact Review account</p>
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

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            required
            autoComplete="email"
            disabled={isLoading}
          />
          {emailTouched && emailError && (
            <p className="text-sm text-red-600">{emailError}</p>
          )}
        </div>

        {/* Password Input (only in password mode) */}
        {authMethod === "password" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-700 transition"
              >
                Forgot password?
              </Link>
            </div>
            <IconInput
              id="password"
              type="password"
              icon={Lock}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Magic Link Info (only in magic link mode) */}
        {authMethod === "magic-link" && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">
                  Passwordless sign in
                </p>
                <p className="text-xs text-purple-700">
                  {"We'll email you a secure link to sign in instantly—no password needed."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          disabled={isLoading || !isFormValid()}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {authMethod === "magic-link" ? "Sending..." : "Signing in..."}
            </>
          ) : authMethod === "magic-link" ? (
            <>
              Send Magic Link
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {"Don't have an account? "}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Sign up
            </Link>
          </p>
        </div>
      </form>

      {/* Terms Footer */}
      <p className="text-center text-sm text-gray-500">
        By signing in, you agree to our{" "}
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
