import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkSeatLimit } from "./lib/billing";
import { getPlanConfig, PLANS } from "./stripe/plans";

export const create = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const orgId = await ctx.db.insert("organizations", {
            name: args.name,
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

        return orgId;
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const memberships = await ctx.db
            .query("members")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const orgs = await Promise.all(
            memberships.map(async (m) => {
                const org = await ctx.db.get(m.organizationId);
                return { ...org, roles: m.roles };
            })
        );

        return orgs.filter((o) => !!o.name); // Filter nulls
    },
});

export const addMember = mutation({
    args: {
        organizationId: v.id("organizations"),
        userId: v.id("users"), // In real app, this would be an invite by email flow
        role: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const currentUserId = await getAuthUserId(ctx);
        if (!currentUserId) throw new Error("Not authenticated");

        // 1. Check Permissions (Must be Owner)
        // Simplified: Any member can add for now? No, assume owner check later.
        const currentMember = await ctx.db.query("members")
            .withIndex("by_org_and_user", q => q.eq("organizationId", args.organizationId).eq("userId", currentUserId))
            .unique();

        if (!currentMember || !currentMember.roles.includes("owner")) {
            throw new Error("Only owners can add members");
        }

        // 2. Check Seat Limits
        await checkSeatLimit(ctx, args.organizationId);

        // 3. Add Member
        await ctx.db.insert("members", {
            userId: args.userId,
            organizationId: args.organizationId,
            roles: [args.role || "member"],
            createdAt: Date.now(),
            createdBy: currentUserId
        });
    }
});

/**
 * Returns the billing status for the user's primary organization.
 */
export const getBillingStatus = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const membership = await ctx.db
            .query("members")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("roles"), ["owner"]))
            .first();

        if (!membership) return null;

        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;

        const subscription = await ctx.db
            .query("subscriptions")
            .withIndex("by_organizationId", (q) => q.eq("organizationId", org._id))
            .unique();

        const plan = getPlanConfig(subscription?.stripePriceId);

        return {
            organizationId: org._id,
            organizationName: org.name,
            stripeCustomerId: org.stripeCustomerId,
            plan,
            subscriptionStatus: subscription?.status || "none",
            isPro: plan.key === "PRO",
            proPriceId: PLANS.PRO.stripePriceId,
            proPriceIdAnnual: PLANS.PRO.stripePriceIdAnnual,
            cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
            currentPeriodEnd: subscription?.currentPeriodEnd || null,
            interval: subscription?.interval || null,
            currency: subscription?.currency || "usd",
        };
    },
});

/**
 * Ensures the user has a personal organization.
 */
export const ensurePersonalOrganization = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("members")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("roles"), ["owner"]))
            .first();

        if (existing) return existing.organizationId;

        const user = await ctx.db.get(userId);
        const orgName = user?.name ? `${user.name}'s Organization` : "Personal Organization";

        const orgId = await ctx.db.insert("organizations", {
            name: orgName,
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

        return orgId;
    },
});
