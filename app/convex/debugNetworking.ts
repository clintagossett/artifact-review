"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a test blob in storage and return its ID
 * This runs in V8 (separate file needed for Node)
 */
// Note: This action is in the Node file but since it's an action (not internalAction),
// we need to move the test blob creation to a separate file or HTTP endpoint

/**
 * Debug action to test networking from Node executor
 * Call via: ctx.runAction(internal.debugNetworking.testNetworking, {})
 */
export const testNetworking = internalAction({
  args: {
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      runtime: "node",
      tests: {},
    };

    // Test 1: Can Node reach localhost:3211?
    try {
      const start = Date.now();
      const resp = await fetch("http://localhost:3211/version");
      results.tests["node_localhost_3211"] = {
        success: resp.ok,
        status: resp.status,
        body: await resp.text(),
        ms: Date.now() - start,
      };
    } catch (e: any) {
      results.tests["node_localhost_3211"] = {
        success: false,
        error: e.message,
        cause: e.cause?.message || null,
      };
    }

    // Test 2: Can Node reach 127.0.0.1:3211?
    try {
      const start = Date.now();
      const resp = await fetch("http://127.0.0.1:3211/version");
      results.tests["node_127.0.0.1_3211"] = {
        success: resp.ok,
        status: resp.status,
        body: await resp.text(),
        ms: Date.now() - start,
      };
    } catch (e: any) {
      results.tests["node_127.0.0.1_3211"] = {
        success: false,
        error: e.message,
        cause: e.cause?.message || null,
      };
    }

    // Test 3: Can Node reach the .loc domain via proxy (172.17.0.1)?
    try {
      const start = Date.now();
      const resp = await fetch("http://172.17.0.1:80/version", {
        headers: { "Host": "mark.convex.site.loc" },
      });
      results.tests["node_proxy_172.17.0.1"] = {
        success: resp.ok,
        status: resp.status,
        body: await resp.text(),
        ms: Date.now() - start,
      };
    } catch (e: any) {
      results.tests["node_proxy_172.17.0.1"] = {
        success: false,
        error: e.message,
        cause: e.cause?.message || null,
      };
    }

    // Test 4: Can Node reach .loc domain directly?
    try {
      const start = Date.now();
      const resp = await fetch("http://mark.convex.site.loc/version");
      results.tests["node_loc_domain"] = {
        success: resp.ok,
        status: resp.status,
        body: await resp.text(),
        ms: Date.now() - start,
      };
    } catch (e: any) {
      results.tests["node_loc_domain"] = {
        success: false,
        error: e.message,
        cause: e.cause?.message || null,
      };
    }

    // Test 5: If storageId provided, test storage.get() (expected to fail)
    if (args.storageId) {
      try {
        const start = Date.now();
        const blob = await ctx.storage.get(args.storageId);
        results.tests["node_storage_get_direct"] = {
          success: blob !== null,
          size: blob?.size || 0,
          type: blob?.type || null,
          ms: Date.now() - start,
        };
      } catch (e: any) {
        results.tests["node_storage_get_direct"] = {
          success: false,
          error: e.message,
          cause: e.cause?.message || null,
        };
      }

      // Test 6: The WORKAROUND - fetch via internal HTTP endpoint
      try {
        const start = Date.now();
        const response = await fetch(
          `http://localhost:3211/internal/storage-blob?storageId=${args.storageId}`
        );
        if (response.ok) {
          const blob = await response.blob();
          results.tests["node_storage_via_http_workaround"] = {
            success: true,
            size: blob.size,
            type: blob.type,
            ms: Date.now() - start,
          };
        } else {
          results.tests["node_storage_via_http_workaround"] = {
            success: false,
            status: response.status,
            ms: Date.now() - start,
          };
        }
      } catch (e: any) {
        results.tests["node_storage_via_http_workaround"] = {
          success: false,
          error: e.message,
          cause: e.cause?.message || null,
        };
      }
    }

    // Environment info
    results.env = {
      CONVEX_CLOUD_URL: process.env.CONVEX_CLOUD_URL || "(not set)",
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL || "(not set)",
    };

    return results;
  },
});
