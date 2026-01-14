/**
 * Utility to get the application's base URL (Frontend).
 * 
 * In development and production, this relies on the SITE_URL environment variable.
 */
export function getAppUrl(): string {
    const domain = process.env.SITE_URL || "http://localhost:3000";

    // Remove trailing slash if present
    return domain.replace(/\/$/, "");
}
