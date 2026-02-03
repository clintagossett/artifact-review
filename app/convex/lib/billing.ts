import { v } from "convex/values";
import { internalQuery, QueryCtx } from "../_generated/server";
import { getPlanConfig } from "../stripe/plans";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Returns the effective Plan Configuration for an Organization.
 */
export async function getActivePlan(ctx: QueryCtx, organizationId: Id<"organizations">) {
    const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .unique();

    // If subscription is canceled/unpaid, falldown to FREE is handled by getPlanConfig logic 
    // (implied by missing or invalid stripePriceId)
    return getPlanConfig(subscription?.stripePriceId);
}

/**
 * Checks if an Organization has reached its Seat Limit.
 * Throws an error if the limit is reached.
 */
export async function checkSeatLimit(ctx: QueryCtx, organizationId: Id<"organizations">) {
    const plan = await getActivePlan(ctx, organizationId);

    if (plan.limits.seats === Infinity) return;

    const currentSeats = (await ctx.db
        .query("members")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect()).length;

    if (currentSeats >= plan.limits.seats) {
        throw new Error(`Plan limit reached: ${plan.name} allows ${plan.limits.seats} seats. Upgrade to add more members.`);
    }
}

/**
 * Checks if an Organization has reached its Document Limit.
 * Throws an error if the limit is reached.
 */
export async function checkDocumentLimit(ctx: QueryCtx, organizationId: Id<"organizations">) {
    const plan = await getActivePlan(ctx, organizationId);

    if (plan.limits.documents === Infinity) return;

    // TODO: Uncomment when 'artifacts' table exists
    //   const currentDocuments = (await ctx.db
    //     .query("artifacts")
    //     .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
    //     .collect()).length;

    //   if (currentDocuments >= plan.limits.documents) {
    //     throw new Error(`Plan limit reached: ${plan.name} allows ${plan.limits.documents} documents. Upgrade to create more.`);
    //   }
}
