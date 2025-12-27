import { Upload, Share2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface HowItWorksSectionProps {
  className?: string;
}

export function HowItWorksSection({ className = "" }: HowItWorksSectionProps) {
  const steps = [
    {
      number: 1,
      icon: Upload,
      title: "Upload Your Artifact",
      description: "Drag and drop your HTML, Markdown, or ZIP file, or use our Claude Code MCP integration for one-click sharing. Renders instantly, perfectly formatted.",
    },
    {
      number: 2,
      icon: Share2,
      title: "Share with Your Team",
      description: "Get a shareable link in seconds. Invite reviewers via email—they can comment without creating accounts or paying for licenses.",
    },
    {
      number: 3,
      icon: MessageSquare,
      title: "Get Inline Feedback",
      description: "Reviewers highlight text, leave comments, @mention teammates. You assign, resolve, and track progress—all in one place.",
    },
  ];

  return (
    <section id="features" className={`max-w-[1280px] mx-auto px-4 md:px-10 py-24 ${className}`}>
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
          HOW IT WORKS
        </p>
        <h2 className="text-3xl md:text-4xl lg:text-[40px] leading-tight font-bold text-gray-900">
          Upload. Share. Get feedback. In 3 clicks.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.number} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>

                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 mb-4">
                  Step {step.number}
                </Badge>

                <h4 className="text-2xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h4>

                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
