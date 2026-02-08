/**
 * Rate Limiting Configuration
 *
 * Defines rate limit policies for all API endpoints.
 * Uses token bucket algorithm for smooth traffic handling.
 *
 * Environment Configuration:
 * - RATE_LIMIT_ENABLED: Enable/disable rate limiting (default: true)
 * - RATE_LIMIT_MULTIPLIER: Scaling factor for limits (default: 1.0)
 *   - Dev: 100.0 (effectively unlimited)
 *   - Test: N/A (disabled via RATE_LIMIT_ENABLED=false)
 *   - Staging: 10.0 (generous for testing)
 *   - Production: 1.0 (real limits)
 */

import { MINUTE, SECOND } from "@convex-dev/rate-limiter";

// Environment configuration
const enabled = process.env.RATE_LIMIT_ENABLED !== "false";
const multiplier = parseFloat(process.env.RATE_LIMIT_MULTIPLIER || "1.0");

// Base limits (multiplied by environment multiplier)
export const BASE_LIMITS = {
  auth: 10,          // Login attempts per minute
  read: 300,         // Read operations per minute
  write: 60,         // Write operations per minute
  upload: 20,        // File uploads per minute
  public: 100,       // Public endpoint access per minute
};

// Token bucket configurations
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits to prevent brute force
  authAttempt: {
    kind: "token bucket" as const,
    rate: BASE_LIMITS.auth * multiplier,
    period: MINUTE,
    capacity: BASE_LIMITS.auth * 1.5 * multiplier,
  },

  // Read endpoints - generous limits for normal usage
  readEndpoint: {
    kind: "token bucket" as const,
    rate: BASE_LIMITS.read * multiplier,
    period: MINUTE,
    capacity: BASE_LIMITS.read * 1.5 * multiplier,
  },

  // Write endpoints - moderate limits
  writeEndpoint: {
    kind: "token bucket" as const,
    rate: BASE_LIMITS.write * multiplier,
    period: MINUTE,
    capacity: BASE_LIMITS.write * 1.5 * multiplier,
  },

  // File upload endpoints - tight limits (most expensive)
  uploadEndpoint: {
    kind: "token bucket" as const,
    rate: BASE_LIMITS.upload * multiplier,
    period: MINUTE,
    capacity: BASE_LIMITS.upload * 1.5 * multiplier,
  },

  // Public/unauthenticated endpoints - moderate limits
  publicEndpoint: {
    kind: "token bucket" as const,
    rate: BASE_LIMITS.public * multiplier,
    period: MINUTE,
    capacity: BASE_LIMITS.public * 1.5 * multiplier,
  },
};

/**
 * Check if rate limiting is enabled in the current environment
 */
export function isRateLimitingEnabled(): boolean {
  return enabled;
}

/**
 * Get effective limit after applying environment multiplier
 */
export function getEffectiveLimit(baseLimit: number): number {
  if (!enabled) return Infinity;
  return baseLimit * multiplier;
}
