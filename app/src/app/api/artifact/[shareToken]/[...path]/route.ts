import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: {
    shareToken: string;
    path: string[];
  };
}

/**
 * Proxy for Convex artifact serving
 *
 * This route proxies requests to the Convex HTTP endpoint, allowing same-origin
 * access to artifact content from the Next.js app. This solves the cross-origin
 * iframe issue where we can't access iframe.contentDocument from different origins.
 *
 * Pattern: /api/artifact/{shareToken}/v{versionNumber}/{filePath}
 * Example: /api/artifact/abc123/v1/index.html
 * Proxies to: {CONVEX_HTTP_URL}/artifact/{shareToken}/v{versionNumber}/{filePath}
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { shareToken, path } = context.params;

  // Build Convex HTTP URL
  const convexHttpUrl = process.env.NEXT_PUBLIC_CONVEX_HTTP_URL;
  if (!convexHttpUrl) {
    console.error('[ARTIFACT PROXY] NEXT_PUBLIC_CONVEX_HTTP_URL not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Reconstruct the full path (e.g., "v1/index.html")
  const fullPath = path.join('/');
  const convexUrl = `${convexHttpUrl}/artifact/${shareToken}/${fullPath}`;

  console.log('[ARTIFACT PROXY] Proxying request:', {
    shareToken,
    path: fullPath,
    convexUrl,
  });

  try {
    // Fetch from Convex HTTP endpoint
    const response = await fetch(convexUrl, {
      method: 'GET',
      headers: {
        // Forward any relevant headers from the original request
        ...(request.headers.get('accept') && {
          'Accept': request.headers.get('accept')!,
        }),
      },
    });

    if (!response.ok) {
      console.error('[ARTIFACT PROXY] Convex returned error:', {
        status: response.status,
        statusText: response.statusText,
        url: convexUrl,
      });

      return new NextResponse(
        `Failed to fetch artifact: ${response.statusText}`,
        {
          status: response.status,
          headers: { 'Content-Type': 'text/plain' },
        }
      );
    }

    // Get content type from Convex response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Get the response body
    const body = await response.arrayBuffer();

    console.log('[ARTIFACT PROXY] Successfully proxied artifact:', {
      contentType,
      size: body.byteLength,
    });

    // Return the proxied response
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour in dev
      },
    });
  } catch (error) {
    console.error('[ARTIFACT PROXY] Error fetching from Convex:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching artifact' },
      { status: 500 }
    );
  }
}
