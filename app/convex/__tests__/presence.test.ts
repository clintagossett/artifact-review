import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

// Constants matching presence.ts (PRESENCE_TTL_MS is 150000ms = 2.5 mins)
const PRESENCE_SLA_MS = 150000;

async function createTestUser(t: any, email: string) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("users", {
            email,
            name: email.split("@")[0],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    });
}

async function createTestArtifact(t: any, userId: Id<"users">) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("artifacts", {
            name: "Test Artifact",
            createdBy: userId,
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

describe("presence", () => {
    it("should record presence and list active users", async () => {
        const t = convexTest(schema);
        const userId = await createTestUser(t, "user@example.com");
        const artifactId = await createTestArtifact(t, userId);
        const versionId = await createTestVersion(t, artifactId, userId);

        const asUser = t.withIdentity({ subject: userId });

        // 1. Initial heartbeat
        await asUser.mutation(api.presence.update, { artifactId, versionId });

        // 2. Check list
        const active = await t.query(api.presence.list, { artifactId });
        expect(active).toHaveLength(1);
        expect(active[0].userId).toBe(userId);
        expect(active[0].name).toBe("user");
    });

    it("should filter out users past the SLA window", async () => {
        const t = convexTest(schema);
        const userId = await createTestUser(t, "user@example.com");
        const artifactId = await createTestArtifact(t, userId);
        const versionId = await createTestVersion(t, artifactId, userId);

        // Manually insert an old presence record
        await t.run(async (ctx) => {
            await ctx.db.insert("presence", {
                createdAt: Date.now(),
                artifactId,
                versionId,
                userId,
                lastSeenAt: Date.now() - (PRESENCE_SLA_MS + 1000), // Just past the window
            });
        });

        const active = await t.query(api.presence.list, { artifactId });
        expect(active).toHaveLength(0);
    });

    it("should update version and timestamp for existing user", async () => {
        const t = convexTest(schema);
        const userId = await createTestUser(t, "user@example.com");
        const artifactId = await createTestArtifact(t, userId);
        const v1 = await createTestVersion(t, artifactId, userId);
        const v2 = await createTestVersion(t, artifactId, userId);

        const asUser = t.withIdentity({ subject: userId });

        // First version
        await asUser.mutation(api.presence.update, { artifactId, versionId: v1 });

        // Switch to second version
        await asUser.mutation(api.presence.update, { artifactId, versionId: v2 });

        const active = await t.query(api.presence.list, { artifactId });
        expect(active).toHaveLength(1);
        expect(active[0].versionId).toBe(v2);
    });
});
