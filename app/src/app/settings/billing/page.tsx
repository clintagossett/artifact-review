"use client";

import { BillingSection } from "@/components/settings/BillingSection";

/**
 * Billing Settings Page
 *
 * Accessible at /settings/billing
 * Contains subscription management and payment settings.
 *
 * Handles Stripe redirect with ?success=true or ?canceled=true query params.
 */
export default function BillingSettingsPage() {
  return <BillingSection />;
}
