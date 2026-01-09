/**
 * useAuthRedirect Hook
 *
 * Manages authentication-based redirects for pages.
 * Redirects users based on their authentication state and configured paths.
 *
 * @example
 * // Public-only page (redirect authenticated users to dashboard)
 * const { isLoading } = useAuthRedirect({ ifAuthenticated: '/dashboard' });
 *
 * @example
 * // Protected page (redirect unauthenticated users to home)
 * const { isLoading } = useAuthRedirect({ ifUnauthenticated: '/' });
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type RedirectConfig = {
  /** Redirect to this path if user is authenticated */
  ifAuthenticated?: string;
  /** Redirect to this path if user is not authenticated */
  ifUnauthenticated?: string;
};

export type UseAuthRedirectReturn = {
  /** True while authentication state is being determined */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
  /** Current user object or null/undefined */
  user: any;
};

export function useAuthRedirect(
  config: RedirectConfig
): UseAuthRedirectReturn {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);

  const isLoading = currentUser === undefined;
  const isAuthenticated = currentUser !== null && currentUser !== undefined;

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && config.ifAuthenticated) {
      router.replace(config.ifAuthenticated);
    }

    if (!isAuthenticated && config.ifUnauthenticated) {
      router.replace(config.ifUnauthenticated);
    }
  }, [isLoading, isAuthenticated, config, router]);

  return {
    isLoading,
    isAuthenticated,
    user: currentUser,
  };
}
