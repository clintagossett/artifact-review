
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

test("reproduce bug: invited user id not linked after signup", async () => {
    const t = convexTest(schema);

    // 1. Setup: Create Owner and Invitee (Invitee not signed up yet)
    const ownerId = await t.run(async (ctx) => {
        const uid = await ctx.db.insert("users", {
            name: "Owner",
            email: "owner@example.com",
            createdAt: Date.now(),
        });
        const orgId = await ctx.db.insert("organizations", { name: "Org", createdAt: Date.now(), createdBy: uid });
        await ctx.db.insert("members", { userId: uid, organizationId: orgId, roles: ["owner"], createdAt: Date.now(), createdBy: uid });
        return uid;
    });

    const inviteeEmail = `e2e-${Date.now()}@tolauante.resend.app`;

    // 2. Create Artifact
    const artifactId = await t.run(async (ctx) => {
        const member = await ctx.db.query("members").withIndex("by_userId_orgId", q => q.eq("userId", ownerId)).first();
        // Since we didn't index by userId alone above (wait, createOrgAndMember creates it), we can look it up.
        // Actually best to look up by user.
        const mem = await ctx.db.query("members").withIndex("by_userId", q => q.eq("userId", ownerId)).first();

        return await ctx.db.insert("artifacts", {
            name: "Test Artifact",
            createdBy: ownerId,
            organizationId: mem!.organizationId,
            shareToken: "abc123xy",
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    });

    // 3. Owner invites Invitee
    await t.withIdentity({ subject: ownerId }).mutation(api.access.grant, {
        artifactId,
        email: inviteeEmail,
    });

    // 4. Verify Invitation State (Artifact Access should point to User Invite)
    const [inviteRecord] = await t.run(async (ctx) =>
        await ctx.db.query("userInvites").collect()
    );
    expect(inviteRecord).toBeDefined();
    expect(inviteRecord.email).toBe(inviteeEmail);

    const [accessRecord] = await t.run(async (ctx) =>
        await ctx.db.query("artifactAccess").collect()
    );
    expect(accessRecord).toBeDefined();
    expect(accessRecord.userInviteId).toBe(inviteRecord._id);
    expect(accessRecord.userId).toBeUndefined();

    // 5. Simulate Invitee Signup
    // This is where "linkInvitesToUserInternal" is called by the auth adapter (or manually in our test)
    const inviteeUserId = await t.run(async (ctx) => {
        const uid = await ctx.db.insert("users", {
            name: "Invitee",
            email: inviteeEmail,
            createdAt: Date.now(),
        });
        const orgId = await ctx.db.insert("organizations", { name: "Invitee Org", createdAt: Date.now(), createdBy: uid });
        await ctx.db.insert("members", { userId: uid, organizationId: orgId, roles: ["owner"], createdAt: Date.now(), createdBy: uid });
        return uid;
    });

    // Call the internal mutation that SHOULD link the records
    // Simulating what happens in convex/auth.ts
    await t.mutation(internal.access.linkInvitesToUserInternal, {
        userId: inviteeUserId,
        email: inviteeEmail,
    });

    // 6. Verify Post-Signup State (The Bug)
    // We expect the access record to be updated to point to the new userId
    const updatedAccessRecord = await t.run(async (ctx) =>
        await ctx.db.get(accessRecord._id)
    );

    // Assertions
    console.log("Updated Access Record:", updatedAccessRecord);

    // If the bug exists, these might fail or show unexpected state
    expect(updatedAccessRecord?.userInviteId).toBeUndefined();
    expect(updatedAccessRecord?.userId).toBe(inviteeUserId);

    // Also check the invite record is marked converted
    const updatedInviteRecord = await t.run(async (ctx) =>
        await ctx.db.get(inviteRecord._id)
    );
    expect(updatedInviteRecord?.convertedToUserId).toBe(inviteeUserId);
});
