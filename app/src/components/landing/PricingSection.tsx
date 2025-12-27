import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PricingSectionProps {
  className?: string;
}

interface PricingTier {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  price: string;
  priceUnit: string;
  annualPrice?: string;
  features: string[];
  ctaText: string;
  ctaHref?: string;
  ctaAction?: () => void;
  highlighted?: boolean;
  footnote?: string;
}

export function PricingSection({ className = "" }: PricingSectionProps) {
  const pricingTiers: PricingTier[] = [
    {
      id: "free",
      name: "Free",
      badge: "Free Forever",
      badgeColor: "bg-green-600 text-white",
      price: "$0",
      priceUnit: "/month",
      features: [
        "3 artifacts",
        "3 versions per artifact",
        "7-day review period",
        "5 reviewers per artifact",
        "Basic commenting",
      ],
      ctaText: "Start Free",
      ctaHref: "/register",
      highlighted: false,
    },
    {
      id: "pro",
      name: "Pro",
      badge: "Most Popular",
      badgeColor: "bg-blue-600 text-white",
      price: "$12",
      priceUnit: "/month",
      annualPrice: "or $10/mo billed annually",
      features: [
        "Unlimited artifacts",
        "Unlimited versions",
        "Unlimited review period",
        "Unlimited reviewers",
        "Advanced commenting",
        "Version history & diff view",
        "Custom branding",
      ],
      ctaText: "Start 14-Day Trial",
      ctaHref: "/register",
      highlighted: true,
      footnote: "No credit card required",
    },
    {
      id: "team",
      name: "Team",
      badge: "Teams 3+",
      badgeColor: "bg-purple-600 text-white",
      price: "$18",
      priceUnit: "/user/mo",
      annualPrice: "or $15/user/mo billed annually",
      features: [
        "Everything in Pro, plus:",
        "Team workspace & folders",
        "Approval workflow",
        "Due dates & reminders",
        "SSO (Google, Microsoft)",
        "Slack integration",
      ],
      ctaText: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className={`max-w-[1280px] mx-auto px-4 md:px-10 py-24 ${className}`}>
      {/* Section Header */}
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
          SIMPLE, TRANSPARENT PRICING
        </p>
        <h2 className="text-[40px] leading-tight font-bold text-gray-900 mb-4">
          Start free. Upgrade when you&apos;re ready.
        </h2>
        <p className="text-lg text-gray-600">
          Creators pay. Reviewers comment for free—always.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.id}
            className={`${
              tier.highlighted
                ? "bg-white border-2 border-blue-600 rounded-xl p-8 shadow-xl relative"
                : "bg-gray-50 border border-gray-200 rounded-xl p-8"
            }`}
          >
            {/* Badge */}
            <Badge className={`${tier.badgeColor} mb-4`}>{tier.badge}</Badge>

            {/* Pricing */}
            <div className="mb-6">
              <span className="text-[48px] font-bold text-gray-900">{tier.price}</span>
              <span className="text-gray-600"> {tier.priceUnit}</span>
              {tier.annualPrice && (
                <p className="text-sm text-gray-600">{tier.annualPrice}</p>
              )}
            </div>

            {/* Features List */}
            <ul className="space-y-3 mb-8">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span
                    className={
                      index === 0 && tier.id === "team"
                        ? "text-gray-900 font-semibold"
                        : tier.id === "pro" && (index === 0 || index === 1)
                        ? "text-gray-900 font-semibold"
                        : "text-gray-700"
                    }
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            {tier.ctaHref ? (
              <Link href={tier.ctaHref}>
                <Button
                  className={`w-full ${
                    tier.highlighted
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "border-2"
                  }`}
                  variant={tier.highlighted ? "default" : "outline"}
                >
                  {tier.ctaText}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full border-2">
                {tier.ctaText}
              </Button>
            )}

            {/* Footnote */}
            {tier.footnote && (
              <p className="text-xs text-gray-500 text-center mt-2">{tier.footnote}</p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
