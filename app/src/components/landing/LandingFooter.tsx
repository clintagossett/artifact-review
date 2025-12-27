import { MessageSquare } from "lucide-react";

interface LandingFooterProps {
  className?: string;
}

export function LandingFooter({ className = "" }: LandingFooterProps) {
  return (
    <footer className={`bg-gray-900 text-gray-400 py-16 ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
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
                <a href="#" className="hover:text-white transition">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="font-semibold text-white mb-4">Resources</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Status
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-semibold text-white mb-4">Company</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2025 Artifact Review. All rights reserved.</p>
          <p className="text-sm">Built with love for AI-native teams</p>
        </div>
      </div>
    </footer>
  );
}
