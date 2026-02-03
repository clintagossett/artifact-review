import { internalMutation } from "../_generated/server";

export const clearAll = internalMutation({
    args: {},
    handler: async (ctx) => {
        // 1. Users & Auth
        await deleteTable(ctx, "users");
        await deleteTable(ctx, "authAccounts");
        await deleteTable(ctx, "authSessions");
        await deleteTable(ctx, "authVerificationRequests");

        // 2. Artifacts & Versions
        await deleteTable(ctx, "artifacts");
        await deleteTable(ctx, "artifactVersions");
        await deleteTable(ctx, "artifactFiles");
        await deleteTable(ctx, "artifactAccess");
        await deleteTable(ctx, "comments");
        await deleteTable(ctx, "commentReplies");
        await deleteTable(ctx, "presence");
        await deleteTable(ctx, "artifactViews");
        await deleteTable(ctx, "artifactVersionStats");

        // 3. Billing / Organizations
        await deleteTable(ctx, "organizations");
        await deleteTable(ctx, "members");
        await deleteTable(ctx, "plans");
        await deleteTable(ctx, "subscriptions");

    },
});

async function deleteTable(ctx: any, tableName: string) {
    const docs = await ctx.db.query(tableName).collect();
    for (const doc of docs) {
        await ctx.db.delete(doc._id);
    }
}
