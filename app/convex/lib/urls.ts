/**
 * Utility to get the application's base URL (Frontend).
 *
 * SITE_URL must be set in Convex env (e.g., http://james.loc for local dev).
 */
export function getAppUrl(): string {
    const domain = process.env.SITE_URL;
    if (!domain) {
        throw new Error("SITE_URL not set in Convex environment");
    }

    // Remove trailing slash if present
    return domain.replace(/\/$/, "");
}
