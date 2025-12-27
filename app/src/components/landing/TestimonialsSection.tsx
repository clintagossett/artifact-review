import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TestimonialsSection {
  className?: string;
}

export function TestimonialsSection({ className = "" }: TestimonialsSection) {
  const testimonials = [
    {
      id: 1,
      quote:
        "We used to waste 30 minutes per PRD reformatting in Google Docs. Now we upload HTML, share a link, and get feedback in hours—not days.",
      author: "Alex Chen",
      title: "Product Manager",
      initials: "AC",
    },
    {
      id: 2,
      quote:
        "Finally, a tool that preserves the quality of AI-generated artifacts. Our design team loves the pixel-perfect fidelity.",
      author: "Morgan Taylor",
      title: "Design Lead",
      initials: "MT",
    },
    {
      id: 3,
      quote:
        "Reviewers don't need Claude Code licenses—that alone saves us $2,000/month. And the review workflow is way more structured than Google Docs.",
      author: "Jamie Rodriguez",
      title: "Engineering Manager",
      initials: "JR",
    },
  ];

  const stats = [
    { value: "500+", label: "Teams using the platform" },
    { value: "10,000+", label: "Artifacts reviewed" },
    { value: "2.5 hrs", label: "Average time saved per week" },
  ];

  return (
    <section className={`py-20 bg-gradient-to-b from-gray-50 to-white ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
            TRUSTED BY PRODUCT TEAMS
          </p>
          <h2 className="text-[40px] leading-tight font-bold text-gray-900">
            Saving 2-3 hours per week for teams like yours
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
            >
              {/* Star Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-lg italic text-gray-700 mb-6 leading-relaxed">
                &quot;{testimonial.quote}&quot;
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-600">{testimonial.title}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-[48px] font-bold text-blue-600 mb-2">{stat.value}</p>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
