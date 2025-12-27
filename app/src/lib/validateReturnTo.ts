/**
 * Validates a returnTo URL parameter to prevent open redirect attacks
 *
 * Security rules:
 * - Only allow relative URLs (starting with /)
 * - Reject absolute URLs (with protocol)
 * - Reject protocol-relative URLs (starting with //)
 * - Return null for invalid URLs
 *
 * @param returnTo - The return URL from query params
 * @returns The validated URL or null if invalid
 */
export function validateReturnTo(returnTo: string | null | undefined): string | null {
  // Return null for empty values
  if (!returnTo || returnTo.trim() === "") {
    return null;
  }

  const trimmed = returnTo.trim();

  // Only allow relative URLs starting with /
  if (!trimmed.startsWith('/')) {
    return null;
  }

  // Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('//')) {
    return null;
  }

  // Reject URLs with protocol (http://, https://, javascript:, etc.)
  if (trimmed.includes('://')) {
    return null;
  }

  // Valid relative URL
  return trimmed;
}
