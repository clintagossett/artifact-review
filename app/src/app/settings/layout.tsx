"use client";

import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon, User, Bot, Terminal, CreditCard } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Settings Layout
 *
 * Shared layout for all settings pages with:
 * - Header with back button
 * - Sidebar navigation using path-based routing
 * - Content area for child pages
 */

const sidebarItems = [
  { id: "account", title: "Account", icon: User, href: "/settings/account" },
  { id: "agents", title: "Agents", icon: Bot, href: "/settings/agents" },
  { id: "developer", title: "Developer", icon: Terminal, href: "/settings/developer" },
  { id: "billing", title: "Billing", icon: CreditCard, href: "/settings/billing" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active section from pathname
  const activeSection = pathname.split("/")[2] || "account";

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            </div>
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
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-start px-4 py-2 rounded-md text-sm transition-colors hover:bg-gray-100",
                        isActive
                          ? "bg-gray-100 hover:bg-gray-100 font-medium text-primary"
                          : "text-gray-600 font-normal"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Content Area */}
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
