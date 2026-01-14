import Stripe from "stripe";
import {
    action,
    internalAction,
    internalMutation,
    internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal, components } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { getAppUrl } from "./lib/urls";

// Initialize Stripe component helper
export const subscriptions = new StripeSubscriptions(components.stripe, {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY || "sk_test_placeholder",
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
 * Now using the Stripe component's StripeSubscriptions helper.
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

        // The domain is used for redirects
        const domain = getAppUrl();
        console.log("Stripe checkout domain:", domain);

        // Create the checkout session using the component helper
        // This automatically handles 'orgId' metadata if we pass it correctly
        const session = await subscriptions.createCheckoutSession(ctx, {
            customerId: org.stripeCustomerId, // Use existing Stripe customer if available
            priceId: args.priceId,
            mode: "subscription",
            successUrl: `${domain}/settings?success=true`,
            cancelUrl: `${domain}/settings?canceled=true`,
            metadata: {
                organizationId: args.organizationId,
            },
            subscriptionMetadata: {
                organizationId: args.organizationId,
            },
        });

        return session.url;
    },
});

/**
 * Creates a Billing Portal session for the organization's customer.
 */
export const createBillingPortalSession = action({
    args: {
        organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
        const org: any = await ctx.runQuery(internal.stripe.internalGetOrganizationById, {
            organizationId: args.organizationId
        });
        if (!org || !org.stripeCustomerId) {
            throw new Error("No Stripe customer found for this organization");
        }

        // The domain is used for redirects
        const domain = getAppUrl();

        // Initialize direct stripe client for portal (component doesn't expose portal yet)
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY!, {
            apiVersion: "2024-12-18.acacia" as any,
        });

        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripeCustomerId,
            return_url: `${domain}/settings`,
        });

        return session.url;
    },
});

/**
 * Action to sync a Stripe subscription to our local database.
 * This is called by the webhook handlers.
 */
export const internalSyncSubscription = internalAction({
    args: {
        stripeSubscriptionId: v.string(),
    },
    handler: async (ctx, args) => {
        console.log(`Syncing subscription: ${args.stripeSubscriptionId}`);
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY!, {
            apiVersion: "2024-12-18.acacia" as any,
        });

        // Fetch the full subscription object from Stripe
        const subscription = await stripe.subscriptions.retrieve(args.stripeSubscriptionId);
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const organizationIdMetadata = subscription.metadata?.organizationId;

        // Find the organization
        let org: any = null;

        // Strategy 1: Use metadata if available (most reliable for first-time conversion)
        if (organizationIdMetadata) {
            org = await ctx.runQuery(internal.stripe.internalGetOrganizationById, {
                organizationId: organizationIdMetadata as any,
            });
        }

        // Strategy 2: Use Customer ID
        if (!org) {
            org = await ctx.runQuery(internal.stripe.internalGetOrganizationByCustomerId, {
                customerId,
            });
        }

        if (!org) {
            console.error(`❌ No organization found for subscription ${subscription.id} (customer: ${customerId}, meta: ${organizationIdMetadata})`);
            return;
        }

        console.log(`✅ Found organization ${org._id} (${org.name}). Syncing local record...`);

        // Update the local subscriptions table
        await ctx.runMutation(internal.stripe.internalCreateSubscription, {
            organizationId: org._id,
            stripeSubscriptionId: subscription.id,
            priceStripeId: subscription.items.data[0].price.id,
            status: subscription.status,
            currentPeriodStart: (subscription.items.data[0].current_period_start || 0) * 1000,
            currentPeriodEnd: (subscription.items.data[0].current_period_end || 0) * 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || !!subscription.cancel_at,
            currency: subscription.currency,
            interval: subscription.items.data[0].price.recurring?.interval || "month",
        });

        console.log(`✨ Successfully synced subscription ${subscription.id} to org ${org._id}`);
    },
});

export const internalGetOrganizationById = internalQuery({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.organizationId);
    }
});

