import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

async function createTestUser(t: any, email: string) {
    return await t.run(async (ctx: any) => {
        const userId = await ctx.db.insert("users", {
            email,
            name: email.split("@")[0],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        const orgId = await ctx.db.insert("organizations", {
            name: "Test Org",
            createdAt: Date.now(),
            createdBy: userId,
        });

        await ctx.db.insert("members", {
            userId,
            organizationId: orgId,
            roles: ["owner"],
            createdAt: Date.now(),
            createdBy: userId,
        });

        return userId;
    });
}

async function createTestArtifact(t: any, userId: Id<"users">) {
    return await t.run(async (ctx: any) => {
        const membership = await ctx.db.query("members")
            .withIndex("by_userId", (q: any) => q.eq("userId", userId))
            .first();

        if (!membership) throw new Error("Test User missing organization");

        return await ctx.db.insert("artifacts", {
            name: "Test Artifact",
            createdBy: userId,
            organizationId: membership.organizationId,
            shareToken: "token-" + Date.now(),
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    });
}

async function createTestVersion(t: any, artifactId: Id<"artifacts">, userId: Id<"users">) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("artifactVersions", {
            artifactId,
            createdBy: userId,
            number: 1,
            fileType: "html",
            entryPoint: "index.html",
            size: 100,
            isDeleted: false,
            createdAt: Date.now(),
        });
    });
}

async function createAccessRecord(t: any, artifactId: Id<"artifacts">, userId: Id<"users">, ownerId: Id<"users">) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("artifactAccess", {
            createdAt: Date.now(),
            artifactId,
            userId,
            createdBy: ownerId,
            isDeleted: false,
            lastSentAt: Date.now(),
            sendCount: 1,
        });
    });
}

describe("views", () => {
    it("should record view and update 3-tier model", async () => {
        const t = convexTest(schema);
        const userId = await createTestUser(t, "user@example.com");
        const artifactId = await createTestArtifact(t, userId);
        const versionId = await createTestVersion(t, artifactId, userId);
        await createAccessRecord(t, artifactId, userId, userId);

        const asUser = t.withIdentity({ subject: userId });

        // 1. Record the view
        await asUser.mutation(api.views.record, { artifactId, versionId });

        // 2. Verify Ledger (Tier 3)
        const ledger = await t.run(async (ctx) => await ctx.db.query("artifactViews").collect());
        expect(ledger).toHaveLength(1);
        expect(ledger[0].userId).toBe(userId);

        // 3. Verify Stats (Tier 2)
        const stats = await t.query(api.views.listByVersion, { versionId });
        expect(stats).toHaveLength(1);
        expect(stats[0].viewCount).toBe(1);

        // 4. Verify Access Cache (Tier 1)
        const access = await t.run(async (ctx) => {
            return await ctx.db
                .query("artifactAccess")
                .withIndex("by_artifactId_userId", q => q.eq("artifactId", artifactId).eq("userId", userId))
                .unique();
        });
        expect(access?.firstViewedAt).toBeDefined();
        expect(access?.lastViewedAt).toBeDefined();
    });

    it("should debounce rapid views (refresh logic)", async () => {
        const t = convexTest(schema);
        const userId = await createTestUser(t, "user@example.com");
        const artifactId = await createTestArtifact(t, userId);
        const versionId = await createTestVersion(t, artifactId, userId);

        const asUser = t.withIdentity({ subject: userId });

        // Rapid fires
        await asUser.mutation(api.views.record, { artifactId, versionId });
        await asUser.mutation(api.views.record, { artifactId, versionId });

        // Should only have 1 ledger entry and viewCount 1
        const ledger = await t.run(async (ctx) => await ctx.db.query("artifactViews").collect());
        expect(ledger).toHaveLength(1);

        const stats = await t.query(api.views.listByVersion, { versionId });
        expect(stats[0].viewCount).toBe(1);
    });

    it("should record separate sessions after debounce period", async () => {
        const t = convexTest(schema);
        const userId = await createTestUser(t, "user@example.com");
        const artifactId = await createTestArtifact(t, userId);
        const versionId = await createTestVersion(t, artifactId, userId);

        const asUser = t.withIdentity({ subject: userId });

        // Initial view
        await asUser.mutation(api.views.record, { artifactId, versionId });

        // Mock time jump (manually editing the lastViewedAt in the DB)
        await t.run(async (ctx) => {
            const stats = await ctx.db.query("artifactVersionStats").unique();
            await ctx.db.patch(stats!._id, { lastViewedAt: Date.now() - (61 * 60 * 1000) }); // 61 min ago (> 60 min debounce)
        });

        // Second view
        await asUser.mutation(api.views.record, { artifactId, versionId });

        // Should have 2 entries
        const ledger = await t.run(async (ctx) => await ctx.db.query("artifactViews").collect());
        expect(ledger).toHaveLength(2);

        const stats = await t.query(api.views.listByVersion, { versionId });
        expect(stats[0].viewCount).toBe(2);
    });
});
