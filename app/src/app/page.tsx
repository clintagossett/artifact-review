"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  LandingHeader,
  HeroSection,
  ProblemSection,
  HowItWorksSection,
  FeaturesSection,
  TestimonialsSection,
  PricingSection,
  FAQSection,
  CTASection,
  LandingFooter,
} from "@/components/landing";

export default function Home() {
  const router = useRouter();
  const currentUser = useQuery(api.auth.getCurrentUser);

  // Redirect authenticated users to dashboard or settings
  // This handles magic link callbacks (/?code=...) and any other case
  // where an authenticated user lands on the home page
  useEffect(() => {
    if (currentUser !== undefined && currentUser !== null) {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get("success");
      const canceled = urlParams.get("canceled");

      if (success === "true" || canceled === "true") {
        router.push(`/settings?${urlParams.toString()}`);
      } else {
        router.push("/dashboard");
      }
    }
  }, [currentUser, router]);

  // Loading state - also shown for authenticated users while redirect is pending
  if (currentUser === undefined || currentUser !== null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Only unauthenticated users see the landing page
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
