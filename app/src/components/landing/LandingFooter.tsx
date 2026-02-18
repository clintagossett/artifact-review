import Link from "next/link";
import { MessageSquare } from "lucide-react";

interface LandingFooterProps {
  className?: string;
}

export function LandingFooter({ className = "" }: LandingFooterProps) {
  return (
    <footer className={`bg-gray-900 text-gray-400 py-16 ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-white">Artifact Review</span>
            </div>
            <p className="text-sm mb-4">
              From AI output to stakeholder feedback in one click
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="font-semibold text-white mb-4">Product</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/#features" className="hover:text-white transition">
                  Features
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-white transition">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-semibold text-white mb-4">Legal</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/acceptable-use"
                  className="hover:text-white transition"
                >
                  Acceptable Use
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white transition">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">&copy; 2026 Artifact Review. All rights reserved.</p>
          <p className="text-sm">Built with love for AI-native teams</p>
        </div>
      </div>
    </footer>
  );
}
