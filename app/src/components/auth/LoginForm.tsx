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
import { DemoCredentialsPanel } from "./DemoCredentialsPanel";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (authMethod === "magic-link") {
        await signIn("resend", { email });
        onSuccess();
      } else {
        await signIn("password", {
          email,
          password,
          flow: "signIn",
        });
        onSuccess();
      }
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

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
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />
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
                  We&apos;ll email you a secure link to sign in instantly—no password needed.
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

        {/* Demo Credentials (only in password mode) */}
        {authMethod === "password" && (
          <DemoCredentialsPanel email="test@example.com" password="password123" />
        )}

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
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
