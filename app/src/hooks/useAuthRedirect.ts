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

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
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
  const { isLoading: isAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);

  // We are loading if the Convex Auth provider says so, 
  // OR if we are authenticated but the user record hasn't loaded yet.
  const isLoading = isAuthLoading || (isConvexAuthenticated && currentUser === undefined);

  // We are authenticated if the provider says so AND we have a user record (or it's still loading)
  const isAuthenticated = isConvexAuthenticated;

  const { ifAuthenticated, ifUnauthenticated } = config;

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && ifAuthenticated) {
      console.log(`[useAuthRedirect] Redirecting to ${ifAuthenticated} because authenticated`);
      router.replace(ifAuthenticated);
    }

    if (!isAuthenticated && ifUnauthenticated) {
      console.log(`[useAuthRedirect] Redirecting to ${ifUnauthenticated} because unauthenticated`);
      router.replace(ifUnauthenticated);
    }
  }, [isLoading, isAuthenticated, ifAuthenticated, ifUnauthenticated, router]);

  return {
    isLoading,
    isAuthenticated,
    user: currentUser,
  };
}
