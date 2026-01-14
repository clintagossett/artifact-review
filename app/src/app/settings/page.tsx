"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { AccountInfoSection } from "@/components/settings/AccountInfoSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { DebugToggle } from "@/components/settings/DebugToggle";
import { useGracePeriod } from "@/hooks/useGracePeriod";

/**
 * Settings Page
 *
 * Protected page for managing account settings:
 * - Account information (email, name)
 * - Password changes with grace period support
 * - Debug toggle (development only)
 */
export default function SettingsPage() {
  const router = useRouter();
  const [debugOverride, setDebugOverride] = useState<"auto" | "fresh" | "stale">("auto");

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Page Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            </div>
            <p className="text-gray-600 ml-15">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            <AccountInfoSection />
            <BillingSection />
            <PasswordSectionWithDebug debugOverride={debugOverride} />
            {process.env.NODE_ENV === "development" && (
              <DebugToggle onOverride={setDebugOverride} />
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}

/**
 * Wrapper for PasswordSection that applies debug override
 * This allows testing both grace period states in development
 */
function PasswordSectionWithDebug({ debugOverride }: { debugOverride: "auto" | "fresh" | "stale" }) {
  // In production or auto mode, just use the regular PasswordSection
  if (process.env.NODE_ENV !== "development" || debugOverride === "auto") {
    return <PasswordSection debugOverride="auto" />;
  }

  // In development with debug override, we need to wrap PasswordSection
  // to override the grace period state
  return <PasswordSection key={debugOverride} debugOverride={debugOverride} />;
}
