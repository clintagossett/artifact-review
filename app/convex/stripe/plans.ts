export const PLANS = {
    FREE: {
        key: "FREE",
        name: "Free Tier",
        limits: {
            documents: 3,
            versionsPerDoc: Infinity,
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
        // Map to the actual Stripe Price IDs
        stripePriceId: process.env.STRIPE_PRICE_ID_PRO,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    },
};

export const getPlanConfig = (stripePriceId?: string) => {
    if (
        stripePriceId &&
        (stripePriceId === PLANS.PRO.stripePriceId || stripePriceId === PLANS.PRO.stripePriceIdAnnual)
    ) {
        return PLANS.PRO;
    }
    return PLANS.FREE;
};
