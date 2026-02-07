"use client";

import { useState } from "react";
import { AccountInfoSection } from "@/components/settings/AccountInfoSection";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { DebugToggle } from "@/components/settings/DebugToggle";

/**
 * Account Settings Page
 *
 * Accessible at /settings/account
 * Contains account info and password management.
 */
export default function AccountSettingsPage() {
  const [debugOverride, setDebugOverride] = useState<"auto" | "fresh" | "stale">("auto");

  return (
    <div className="space-y-6">
      <AccountInfoSection />
      <PasswordSection debugOverride={debugOverride} />
      {process.env.NODE_ENV === "development" && (
        <DebugToggle onOverride={setDebugOverride} />
      )}
    </div>
  );
}
