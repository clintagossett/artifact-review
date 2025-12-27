import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  className?: string;
}

export function CTASection({ className = "" }: CTASectionProps) {
  return (
    <section className={`bg-gradient-to-r from-blue-600 to-purple-600 py-24 ${className}`}>
      <div className="max-w-[720px] mx-auto px-4 md:px-10 text-center">
        <h2 className="text-[40px] leading-tight font-bold text-white mb-6">
          Stop screenshotting and emailing. Start collaborating.
        </h2>
        <p className="text-xl text-white/90 mb-8 leading-relaxed">
          Join 500+ product teams saving 2-3 hours per week. Free to start, upgrade anytime.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-base font-semibold rounded-lg"
            >
              Start Free
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-base font-semibold rounded-lg"
          >
            Watch Demo
          </Button>
        </div>
        <p className="text-sm text-white/80">
          No credit card required • 3 artifacts free forever
        </p>
      </div>
    </section>
  );
}
