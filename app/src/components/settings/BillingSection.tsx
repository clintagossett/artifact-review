"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, ExternalLink, Zap, AlertCircle, ShieldCheck, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * BillingSection Component
 * 
 * Displays current plan and provides buttons to:
 * - Upgrade to Pro (via Stripe Checkout)
 * - Manage Billing (via Stripe Customer Portal)
 */
export function BillingSection() {
    const billingStatus = useQuery(api.organizations.getBillingStatus);
    const bootstrapOrg = useMutation(api.organizations.ensurePersonalOrganization);
    const createCheckout = useAction(api.stripe.createCheckoutSession);
    const createPortal = useAction(api.stripe.createBillingPortalSession);
    const [isLoading, setIsLoading] = useState(false);
    const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual");
    const { toast } = useToast();
    const searchParams = useSearchParams();

    // Auto-bootstrap org if none exists
    useEffect(() => {
        if (billingStatus === null) {
            bootstrapOrg();
        }
    }, [billingStatus, bootstrapOrg]);

    const handleUpgrade = async () => {
        const priceId = billingInterval === "monthly" ? billingStatus?.proPriceId : billingStatus?.proPriceIdAnnual;

        if (!billingStatus?.organizationId || !priceId) {
            toast({
                title: "Upgrade unavailable",
                description: "Pro plan configuration is missing. Please check your environment variables.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const checkoutUrl = await createCheckout({
                organizationId: billingStatus.organizationId,
                priceId: priceId,
            });
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            }
        } catch (error) {
            console.error("Failed to start checkout:", error);
            toast({
                title: "Checkout failed",
                description: "Could not initialize billing session. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleManageBilling = async () => {
        if (!billingStatus?.organizationId) return;

        setIsLoading(true);
        try {
            const portalUrl = await createPortal({
                organizationId: billingStatus.organizationId,
            });
            if (portalUrl) {
                window.location.href = portalUrl;
            }
        } catch (error) {
            console.error("Failed to open portal:", error);
            toast({
                title: "Portal failed",
                description: "Could not open billing portal. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (billingStatus === undefined || billingStatus === null) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Plans & Billing</CardTitle>
                    <CardDescription>
                        {billingStatus === null ? "Setting up your account..." : "Manage your subscription and limits"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    const { plan, isPro, cancelAtPeriodEnd, currentPeriodEnd, interval, currency } = billingStatus;

    const isSuccess = searchParams.get("success") === "true";

    return (
        <Card className="overflow-hidden border-none shadow-lg bg-white">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Subscription & Billing</CardTitle>
                        <CardDescription className="text-base text-gray-500">
                            Manage your account usage and plan details
                        </CardDescription>
                    </div>
                    <Badge variant={isPro ? "default" : "secondary"} className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${isPro ? "bg-purple-600 shadow-sm" : "bg-gray-200 text-gray-700"}`}>
                        {isPro ? "PRO" : "FREE"}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Cancellation Alert */}
                {isPro && cancelAtPeriodEnd && (
                    <div className="m-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-amber-900">Subscription Canceled</p>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                Your access to Pro features will continue until{" "}
                                <span className="font-bold underline decoration-amber-300">
                                    {currentPeriodEnd
                                        ? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })
                                        : "the end of your period"}
                                </span>
                                . You will not be charged again.
                            </p>
                            <p className="text-sm text-amber-700 mt-3 p-2 bg-white/50 rounded-lg border border-amber-100">
                                <span className="font-semibold text-amber-900 underline">Changed your mind?</span> Click "Manage Billing" below and select <span className="italic font-bold text-amber-900">"Don't Cancel My Subscription"</span> to keep your access.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left Side: Current Plan Context */}
                    <div className="p-8 border-b md:border-b-0 md:border-r border-gray-100">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPro ? "bg-purple-100" : "bg-gray-100 text-gray-600"}`}>
                                    <Check className={`w-5 h-5 ${isPro ? "text-purple-600" : "text-gray-400"}`} />
                                </div>
                                Your {plan.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 pl-10">
                                {isPro ? "Enjoying full access to AR features." : "Essential features for individuals."}
                            </p>
                        </div>

                        <ul className="space-y-4 pl-10">
                            <li className="flex items-start gap-3 text-sm text-gray-600">
                                <div className="mt-0.5 rounded-full bg-green-100 p-0.5">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <span>
                                    <span className={`font-bold ${isPro ? "text-purple-700" : "text-gray-900"}`}>
                                        {plan.limits.documents === Infinity ? "Unlimited" : plan.limits.documents}
                                    </span> active documents
                                </span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-gray-600">
                                <div className="mt-0.5 rounded-full bg-green-100 p-0.5">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <span>Unlimited versions per artifact</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-gray-600">
                                <div className="mt-0.5 rounded-full bg-green-100 p-0.5">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <span>Public share links</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-gray-600">
                                <div className={`mt-0.5 rounded-full p-0.5 ${plan.limits.agentApi ? "bg-green-100" : "bg-gray-100"}`}>
                                    <Check className={`w-3 h-3 ${plan.limits.agentApi ? "text-green-600" : "text-gray-300"}`} />
                                </div>
                                <span className={plan.limits.agentApi ? "" : "text-gray-400"}>
                                    Agent API access {plan.limits.agentApi ? "(Full R/W)" : "(Read-only)"}
                                </span>
                            </li>
                        </ul>

                        {isPro && (
                            <div className="mt-8 pt-6 border-t border-gray-50">
                                <Button
                                    variant="outline"
                                    onClick={handleManageBilling}
                                    disabled={isLoading}
                                    className="w-full text-gray-600 border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                                    Manage Subscription & Invoices
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Upgrade Call to Action or Status */}
                    {!isPro ? (
                        <div className="p-8 bg-gradient-to-br from-purple-50 to-white relative overflow-hidden">
                            {/* Decorative element */}
                            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-purple-600 fill-purple-600" />
                                        <h4 className="font-bold text-gray-900 uppercase tracking-tight text-sm">Unlock Pro</h4>
                                    </div>
                                    <div className="flex p-1 bg-purple-100/50 rounded-lg">
                                        <button
                                            onClick={() => setBillingInterval("monthly")}
                                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${billingInterval === "monthly" ? "bg-white text-purple-600 shadow-sm" : "text-purple-400 hover:text-purple-500"}`}
                                        >
                                            Monthly
                                        </button>
                                        <button
                                            onClick={() => setBillingInterval("annual")}
                                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${billingInterval === "annual" ? "bg-white text-purple-600 shadow-sm" : "text-purple-400 hover:text-purple-500"}`}
                                        >
                                            Annual
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${billingInterval === "annual" ? "bg-purple-100 text-purple-700" : "bg-purple-50 text-purple-300"}`}>
                                                Best Value
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-gray-900 tracking-tight">
                                                {billingInterval === "monthly" ? "$12" : "$10"}
                                            </span>
                                            <span className="text-gray-500 font-medium">/mo</span>
                                        </div>
                                        {billingInterval === "annual" && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Billed as $120/year</span>
                                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                                    SAVE $24/YR
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-purple-100 shadow-sm">
                                        <p className="text-xs font-bold text-purple-900 tracking-wide uppercase">Bonus Features:</p>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                                Unlimited active documents
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                                Full Agent API (Read + Write)
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 italic">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                Priority Support
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <Button
                                        onClick={handleUpgrade}
                                        disabled={isLoading}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 text-base shadow-lg shadow-purple-200 group transition-all"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Upgrade to Pro
                                                <Zap className="w-4 h-4 ml-2 fill-white group-hover:scale-110 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-center text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-widest">
                                        Secure Checkout via Stripe
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : isSuccess ? (
                        <div className="p-8 bg-gray-50 flex items-center justify-center border-l border-gray-100 animate-in fade-in zoom-in duration-500">
                            <div className="text-center max-w-[240px]">
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-md border border-gray-100 flex items-center justify-center mx-auto mb-6 relative">
                                    <Check className="w-10 h-10 text-green-500" />
                                    <div className="absolute inset-0 bg-green-500/10 rounded-3xl blur-xl animate-pulse" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h4>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Your upgrade was successful. You now have full access to all Pro features and unlimited documents.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 bg-gray-50 flex items-start justify-center border-l border-gray-100 font-sans">
                            <div className="w-full space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <ShieldCheck className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Active Subscription</h4>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                            {interval === "annual" ? "Annual" : "Monthly"} Billing
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                Next Billing Date
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                {currentPeriodEnd
                                                    ? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric"
                                                    })
                                                    : "N/A"
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Amount</span>
                                            <span className="font-bold text-gray-900">
                                                {interval === "annual" ? "$120.00" : "$12.00"}
                                                <span className="text-[10px] text-gray-400 ml-1 uppercase">{currency}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                        <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-tight">
                                            Account is in good standing
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
