import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Store original NODE_ENV
const originalEnv = process.env.NODE_ENV;

describe('middleware', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore NODE_ENV
    vi.stubEnv('NODE_ENV', originalEnv!);
  });

  describe('in development', () => {
    it('should not redirect HTTP requests', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      // Dynamic import to get fresh module with new env
      const { middleware } = await import('../middleware');

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: { 'x-forwarded-proto': 'http' },
      });

      const response = middleware(request);

      // In development, should pass through
      expect(response.headers.get('x-middleware-next')).toBe('1');
    });
  });

  describe('in production', () => {
    it('should redirect HTTP to HTTPS with 301 status', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { middleware } = await import('../middleware');

      const request = new NextRequest('http://example.com/dashboard', {
        headers: { 'x-forwarded-proto': 'http' },
      });

      const response = middleware(request);

      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toContain('https://');
    });

    it('should preserve path in redirect', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { middleware } = await import('../middleware');

      const request = new NextRequest('http://example.com/dashboard/settings', {
        headers: { 'x-forwarded-proto': 'http' },
      });

      const response = middleware(request);

      expect(response.headers.get('location')).toContain('/dashboard/settings');
    });

    it('should preserve query params in redirect', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { middleware } = await import('../middleware');

      const request = new NextRequest('http://example.com/share?id=123&view=full', {
        headers: { 'x-forwarded-proto': 'http' },
      });

      const response = middleware(request);

      const location = response.headers.get('location');
      expect(location).toContain('id=123');
      expect(location).toContain('view=full');
    });

    it('should not redirect HTTPS requests', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { middleware } = await import('../middleware');

      const request = new NextRequest('https://example.com/dashboard', {
        headers: { 'x-forwarded-proto': 'https' },
      });

      const response = middleware(request);

      // Should pass through (no redirect)
      expect(response.headers.get('x-middleware-next')).toBe('1');
    });

    it('should not redirect when x-forwarded-proto header is missing', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { middleware } = await import('../middleware');

      const request = new NextRequest('https://example.com/dashboard');

      const response = middleware(request);

      // Should pass through (no redirect)
      expect(response.headers.get('x-middleware-next')).toBe('1');
    });
  });
});
