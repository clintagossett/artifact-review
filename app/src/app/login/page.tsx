"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { PublicOnlyPage } from "@/components/auth/PublicOnlyPage";
import { validateReturnTo } from "@/lib/validateReturnTo";

import { useEffect, Suspense } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle returnTo from query params or localStorage
  useEffect(() => {
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      localStorage.setItem("returnTo", returnTo);
    }
  }, [searchParams]);

  const handleSuccess = () => {
    // Check for returnTo parameter and validate it
    const queryReturnTo = searchParams.get("returnTo");
    const localReturnTo = localStorage.getItem("returnTo");
    const returnTo = queryReturnTo || localReturnTo;

    const validatedReturnTo = validateReturnTo(returnTo);

    if (validatedReturnTo) {
      localStorage.removeItem("returnTo");
      router.push(validatedReturnTo);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <PublicOnlyPage>
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-blue-50 via-white to-purple-50">
        {/* Back Button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>

        <LoginForm onSuccess={handleSuccess} />
      </div>
    </PublicOnlyPage>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 font-medium">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
