import Stripe from "stripe";
import {
    action,
    internalAction,
    internalMutation,
    internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Initialize Stripe client. We use a placeholder if the key is missing to allow
// the module to be analyzed by Convex during deployment.
export const stripeClient = new Stripe(process.env.STRIPE_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover" as any,
    typescript: true,
});

/**
 * Updates an organization's Stripe Customer ID.
 */
export const internalUpdateCustomerId = internalMutation({
    args: {
        organizationId: v.id("organizations"),
        customerId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.organizationId, { stripeCustomerId: args.customerId });
    },
});

export const internalGetOrganizationByCustomerId = internalQuery({
    args: {
        customerId: v.string(),
    },
    handler: async (ctx, args) => {
        const org = await ctx.db
            .query("organizations")
            .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", args.customerId))
            .unique();
        return org;
    },
});

/**
 * Creates/Inserts a subscription for an Organization.
 */
export const internalCreateSubscription = internalMutation({
    args: {
        organizationId: v.id("organizations"),
        planId: v.optional(v.id("plans")),
        priceStripeId: v.string(),
        stripeSubscriptionId: v.string(),
        status: v.string(),
        currentPeriodStart: v.number(),
        currentPeriodEnd: v.number(),
        cancelAtPeriodEnd: v.boolean(),
        currency: v.optional(v.string()),
        interval: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("subscriptions")
            .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
            .unique();

        const subData = {
            organizationId: args.organizationId,
            planId: args.planId,
            stripePriceId: args.priceStripeId,
            stripeSubscriptionId: args.stripeSubscriptionId,
            status: args.status,
            currentPeriodStart: args.currentPeriodStart,
            currentPeriodEnd: args.currentPeriodEnd,
            cancelAtPeriodEnd: args.cancelAtPeriodEnd,
            currency: args.currency,
            interval: args.interval,
            createdAt: Date.now(),
        }

        if (existing) {
            await ctx.db.patch(existing._id, subData); // Update existing
        } else {
            await ctx.db.insert("subscriptions", subData);
        }
    },
});

export const internalDeleteSubscription = internalMutation({
    args: {
        stripeSubscriptionId: v.string(),
    },
    handler: async (ctx, args) => {
        const sub = await ctx.db
            .query("subscriptions")
            .withIndex("by_stripeSubscriptionId", (q) => q.eq("stripeSubscriptionId", args.stripeSubscriptionId))
            .unique();
        if (sub) {
            await ctx.db.delete(sub._id);
        }
    },
});

/**
 * Checkout Action: Creates a Session to upgrade an Org.
 */
export const createCheckoutSession = action({
    args: {
        organizationId: v.id("organizations"),
        priceId: v.string(), // "price_..."
    },
    handler: async (ctx, args) => {
        const org: any = await ctx.runQuery(internal.stripe.internalGetOrganizationById, {
            organizationId: args.organizationId
        });
        if (!org) throw new Error("Organization not found");

        const domain = process.env.CONVEX_SITE_URL || "http://localhost:3000";

        const session: Stripe.Checkout.Session = await stripeClient.checkout.sessions.create({
            mode: "subscription",
            line_items: [{ price: args.priceId, quantity: 1 }],
            customer: org.stripeCustomerId, // Reuse if exists
            // If no customer ID, Stripe creates a new one.
            // We need to capture it in the webhook!
            customer_creation: org.stripeCustomerId ? undefined : "always",
            customer_email: undefined, // Let user enter email, or pass org owner email if known
            success_url: `${domain}/dashboard?success=true`,
            cancel_url: `${domain}/dashboard?canceled=true`,
            metadata: {
                organizationId: args.organizationId, // Pass OrgID to webhook via metadata
            },
        });

        return session.url;
    },
});

export const internalGetOrganizationById = internalQuery({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.organizationId);
    }
});
