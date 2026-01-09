import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to monitor grace period status and countdown
 *
 * The grace period is a 15-minute window after authentication where users
 * can change their password without entering their current password.
 *
 * This hook:
 * 1. Queries the backend for grace period status
 * 2. Maintains a local countdown timer that updates every second
 * 3. Automatically updates when the grace period expires
 */
export function useGracePeriod() {
  const gracePeriodStatus = useQuery(api.settings.getGracePeriodStatus);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Update countdown timer every second
  useEffect(() => {
    if (!gracePeriodStatus?.expiresAt) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      if (!gracePeriodStatus?.expiresAt) {
        setTimeRemaining(0);
        return;
      }
      const remaining = Math.max(0, gracePeriodStatus.expiresAt - Date.now());
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [gracePeriodStatus?.expiresAt]);

  return {
    isWithinGracePeriod: gracePeriodStatus?.isWithinGracePeriod ?? false,
    expiresAt: gracePeriodStatus?.expiresAt ?? null,
    timeRemaining,
    isLoading: gracePeriodStatus === undefined,
  };
}

/**
 * Format milliseconds to human-readable time
 * Examples:
 * - 5 minutes 30 seconds
 * - 1 minute 45 seconds
 * - 30 seconds
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
  return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
}
