"use client";

import { Button } from "@/components/ui/button";
import { Wrench, Unlock, Lock } from "lucide-react";

type DebugState = "auto" | "fresh" | "stale";

interface DebugToggleProps {
  onOverride: (state: DebugState) => void;
}

/**
 * Debug Toggle
 *
 * Development-only component for testing grace period states.
 * Allows instant switching between fresh/stale states.
 *
 * IMPORTANT: Only renders in development mode.
 * Usage in Settings page:
 * {process.env.NODE_ENV === 'development' && <DebugToggle />}
 */
export function DebugToggle({ onOverride }: DebugToggleProps) {
  return (
    <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-4 h-4 text-purple-700" />
        <p className="text-sm font-medium text-purple-900">
          Debug Mode: Test Grace Period States
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => onOverride("auto")}
          variant="outline"
          size="sm"
          className="bg-white hover:bg-purple-50 border-purple-300 text-purple-900"
          title="Use real session timing"
        >
          Auto
        </Button>
        <Button
          onClick={() => onOverride("fresh")}
          variant="outline"
          size="sm"
          className="bg-white hover:bg-purple-50 border-purple-300 text-purple-900"
          title="Force 'recently logged in' state"
        >
          <Unlock className="w-4 h-4 mr-1" />
          Fresh
        </Button>
        <Button
          onClick={() => onOverride("stale")}
          variant="outline"
          size="sm"
          className="bg-white hover:bg-purple-50 border-purple-300 text-purple-900"
          title="Force 'session expired' state"
        >
          <Lock className="w-4 h-4 mr-1" />
          Stale
        </Button>
      </div>

      <div className="space-y-2 border-t border-purple-200 pt-3">
        <p className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Instructions for Testers</p>
        <ul className="text-xs text-purple-700 space-y-1.5 list-disc pl-4">
          <li>
            <span className="font-bold underline">Fresh</span>: Simulates a user who just signed in within the 15-min window. They can change passwords <span className="italic">without</span> knowing their current one.
          </li>
          <li>
            <span className="font-bold underline">Stale</span>: Simulates an old session. Security forces the user to enter their <span className="italic">Current Password</span> or click a Magic Link to re-authenticate.
          </li>
        </ul>
      </div>

      <p className="text-[10px] text-purple-400 mt-4 italic">
        * This debug panel is stripped from production builds automatically.
      </p>
    </div>
  );
}
