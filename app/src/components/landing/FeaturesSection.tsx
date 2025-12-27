import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FeaturesSectionProps {
  className?: string;
}

export function FeaturesSection({ className = "" }: FeaturesSectionProps) {
  const reviewers = ["MJ", "ED", "AT", "JR", "KL"];

  return (
    <section className={`bg-gray-50 py-24 ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
            KEY FEATURES
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-[40px] leading-tight font-bold text-gray-900 max-w-[720px] mx-auto">
            Built for AI-native teams. Works with your entire stack.
          </h2>
        </div>

        <div className="space-y-24">
          {/* Feature 1 - Zero Format Loss */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 mb-4">
                AI-Native
              </Badge>

              <h3 className="text-2xl md:text-3xl lg:text-[32px] leading-tight font-semibold text-gray-900 mb-4">
                Zero Format Loss
              </h3>

              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                What AI generates is what stakeholders see. No copy-paste degradation, no 30-minute cleanup. Tables, code blocks, diagrams—everything stays pixel-perfect.
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Upload HTML directly, renders beautifully</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Responsive design preserved</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Export with comments baked in</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Google Docs ✗</p>
                  <div className="bg-red-50 border border-red-200 rounded p-4 space-y-2">
                    <div className="h-3 bg-red-200 rounded w-full"></div>
                    <div className="h-3 bg-red-200 rounded w-3/4"></div>
                    <div className="h-3 bg-red-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Artifact Review ✓</p>
                  <div className="bg-green-50 border border-green-200 rounded p-4 space-y-2">
                    <div className="h-3 bg-green-600 rounded w-full"></div>
                    <div className="h-3 bg-green-600 rounded w-3/4"></div>
                    <div className="h-3 bg-green-600 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Reviewers Don't Need Licenses */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="md:order-2">
              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 mb-4">
                Collaboration
              </Badge>

              <h3 className="text-2xl md:text-3xl lg:text-[32px] leading-tight font-semibold text-gray-900 mb-4">
                Reviewers Don&apos;t Need Licenses
              </h3>

              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                Share with executives, clients, and cross-functional partners—no AI tool accounts required. Only creators pay for uploads. Reviewers comment for free, always.
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Claude Team Projects requires $30-60/user for everyone</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">We remove that barrier—reviewers are always free</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Invite anyone with an email address</span>
                </li>
              </ul>
            </div>

            <div className="md:order-1 bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      SC
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">Creator</p>
                    <p className="text-xs text-gray-600">Paid user</p>
                  </div>
                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">✓ Paid</span>
                </div>

                {reviewers.map((initials, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-300 text-gray-700 font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Reviewer {i + 1}</p>
                      <p className="text-xs text-gray-600">Can comment</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">Free</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
