// @vitest-environment node
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../../../app/convex/schema";
import { api, internal } from "../../../app/convex/_generated/api";
import { TRACKING_CONFIG } from "../../../app/convex/shared";

/**
 * Test Suite: Presence Cleanup Logic
 * Verifies that the internal cleanup mutation respects the retention policy.
 * 
 * NOTE: This test requires being run from the 'app/' directory context where
 * 'convex-test' dependencies are installed.
 */
describe("Presence Cleanup Logic", () => {
    test("Deletes records older than retention period", async () => {
        const t = convexTest(schema);
        const now = Date.now();
        const RETENTION = TRACKING_CONFIG.PRESENCE_DATA_RETENTION_MS;

        // 1. Setup Base Data (Users & Artifact)
        // We need real IDs to pass validation
        const { uA, uB, uC, uD, artifactId, versionId } = await t.run(async (ctx) => {
            // Create 4 users
            const uA = await ctx.db.insert("users", { name: "A", email: "a@test.com", createdAt: now });
            const uB = await ctx.db.insert("users", { name: "B", email: "b@test.com", createdAt: now });
            const uC = await ctx.db.insert("users", { name: "C", email: "c@test.com", createdAt: now });
            const uD = await ctx.db.insert("users", { name: "D", email: "d@test.com", createdAt: now });

            // Create 1 artifact context
            // Matching schema: createdBy, shareToken, isDeleted, createdAt
            const artifactId = await ctx.db.insert("artifacts", {
                name: "Test",
                createdBy: uA, // Correct field
                shareToken: "token123",
                isDeleted: false,
                createdAt: now
            });

            // Matching schema: artifactId, number, createdBy, fileType, entryPoint, size, isDeleted, createdAt
            const versionId = await ctx.db.insert("artifactVersions", {
                artifactId,
                number: 1,
                createdBy: uA,
                fileType: "html",
                entryPoint: "index.html",
                size: 100,
                isDeleted: false,
                createdAt: now
            });

            return { uA, uB, uC, uD, artifactId, versionId };
        });

        // 2. Insert Presence Records with explicit timestamps relative to 'now'
        // User A: Active recently (lastSeenAt = now - 1s) -> KEEP
        await t.run(async (ctx) => {
            await ctx.db.insert("presence", {
                userId: uA, artifactId, versionId,
                lastSeenAt: now - 1000,
                createdAt: now - 1000,
            });
        });

        // User B: Old but within retention (lastSeenAt = now - (RETENTION - 5s)) -> KEEP
        await t.run(async (ctx) => {
            await ctx.db.insert("presence", {
                userId: uB, artifactId, versionId,
                lastSeenAt: now - (RETENTION - 5000),
                createdAt: now,
            });
        });

        // User C: Just expired (lastSeenAt = now - (RETENTION + 1s)) -> DELETE
        await t.run(async (ctx) => {
            await ctx.db.insert("presence", {
                userId: uC, artifactId, versionId,
                lastSeenAt: now - (RETENTION + 1000),
                createdAt: now,
            });
        });

        // User D: Very old (lastSeenAt = now - 2*RETENTION) -> DELETE
        await t.run(async (ctx) => {
            await ctx.db.insert("presence", {
                userId: uD, artifactId, versionId,
                lastSeenAt: now - (RETENTION * 2),
                createdAt: now,
            });
        });

        // 3. Run Cleanup
        await t.mutation(internal.presence.cleanup);

        // 4. Verify Results
        const allPresence = await t.run(async (ctx) => {
            return await ctx.db.query("presence").collect();
        });

        const presentUserIds = allPresence.map(p => p.userId);

        expect(presentUserIds).toContain(uA);
        expect(presentUserIds).toContain(uB);
        expect(presentUserIds).not.toContain(uC);
        expect(presentUserIds).not.toContain(uD);
        expect(allPresence.length).toBe(2);
    });
});
