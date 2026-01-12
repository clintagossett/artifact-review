export const PLANS = {
    FREE: {
        key: "FREE",
        name: "Free Tier",
        limits: {
            documents: 3,
            versionsPerDoc: 5,
            publicLinks: true,
            agentApi: false, // Read-Only
            seats: 1, // Personal only
        },
        stripePriceId: null,
    },
    PRO: {
        key: "PRO",
        name: "Pro Plan",
        limits: {
            documents: Infinity,
            versionsPerDoc: Infinity,
            publicLinks: true,
            agentApi: true, // Read+Write
            seats: 1, // Still Personal only
        },
        // Map to the actual Stripe Price ID
        // Sandbox Price ID: price_1Soahn2NJVHamenmujQQRlNm
        stripePriceId: process.env.STRIPE_PRICE_ID_PRO,
    },
};

export const getPlanConfig = (stripePriceId?: string) => {
    if (stripePriceId && stripePriceId === PLANS.PRO.stripePriceId) return PLANS.PRO;
    return PLANS.FREE;
};
