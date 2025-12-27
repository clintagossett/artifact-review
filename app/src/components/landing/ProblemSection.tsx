interface ProblemSectionProps {
  className?: string;
}

export function ProblemSection({ className = "" }: ProblemSectionProps) {
  return (
    <section className={`bg-gray-50 py-20 ${className}`}>
      <div className="max-w-[720px] mx-auto px-4 md:px-10 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
          THE PROBLEM
        </p>

        <h2 className="text-3xl md:text-4xl lg:text-[40px] leading-tight font-bold text-gray-900 mb-6">
          AI tools generate HTML. Collaboration tools break it.
        </h2>

        <p className="text-lg text-gray-600 leading-relaxed">
          Product managers using Claude Code and Cursor generate PRDs, specs, and prototypes as HTML—perfectly formatted with tables, code blocks, and styling. But sharing with stakeholders means copying to Google Docs (formatting breaks), sending screenshots (no interactivity), or zipping files (no collaboration). You waste 2-3 hours per week reformatting. We fix that.
        </p>
      </div>
    </section>
  );
}
