"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Why not just use Google Docs?",
    answer:
      "Google Docs breaks HTML formatting—tables, code blocks, and styling get lost. We preserve AI output perfectly, with zero format degradation.",
  },
  {
    question: "Do reviewers need to create accounts?",
    answer:
      "No. Reviewers can comment with just an email address—no signup required. Only document creators (uploaders) need paid plans.",
  },
  {
    question: "How does MCP integration work?",
    answer:
      "With our Claude Code MCP server, you can share documents directly from Claude Code in one click. No manual upload needed.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We're SOC 2 compliant and GDPR-ready.",
  },
  {
    question: "What AI tools do you support?",
    answer:
      "Any AI tool that generates HTML or Markdown—Claude Code, Cursor, ChatGPT, Gemini, and more. Upload HTML, MD, or ZIP files from any source.",
  },
];

interface FAQSectionProps {
  className?: string;
}

export function FAQSection({ className = "" }: FAQSectionProps) {
  return (
    <section id="faq" className={`bg-gray-50 py-24 ${className}`}>
      <div className="max-w-[720px] mx-auto px-4 md:px-10">
        <h2 className="text-[40px] leading-tight font-bold text-gray-900 text-center mb-12">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-white border border-gray-200 rounded-lg px-6"
            >
              <AccordionTrigger className="font-semibold text-gray-900 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
