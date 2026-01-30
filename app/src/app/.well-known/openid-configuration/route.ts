import { NextResponse } from "next/server";

/**
 * OIDC Discovery endpoint proxy
 *
 * This forwards requests to the Convex HTTP actions URL where the actual
 * OIDC configuration is served by @convex-dev/auth.
 *
 * Required for self-hosted Convex where the JWT issuer (api.mark.loc)
 * differs from where the discovery endpoint is hosted (mark.convex.site.loc).
 */
export async function GET() {
  const convexSiteUrl =
    process.env.NEXT_PUBLIC_CONVEX_HTTP_URL || "https://mark.convex.site.loc";

  try {
    const response = await fetch(
      `${convexSiteUrl}/.well-known/openid-configuration`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch OIDC configuration" },
        { status: response.status }
      );
    }

    const config = await response.json();

    return NextResponse.json(config, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("OIDC discovery proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch OIDC configuration" },
      { status: 500 }
    );
  }
}
