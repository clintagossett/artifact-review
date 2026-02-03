import { NextResponse } from "next/server";

/**
 * JWKS endpoint proxy
 *
 * This forwards requests to the Convex HTTP actions URL where the actual
 * JWKS is served by @convex-dev/auth.
 */
export async function GET() {
  const convexSiteUrl =
    process.env.NEXT_PUBLIC_CONVEX_HTTP_URL || "https://mark.convex.site.loc";

  try {
    const response = await fetch(`${convexSiteUrl}/.well-known/jwks.json`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch JWKS" },
        { status: response.status }
      );
    }

    const jwks = await response.json();

    return NextResponse.json(jwks, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("JWKS proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch JWKS" }, { status: 500 });
  }
}
