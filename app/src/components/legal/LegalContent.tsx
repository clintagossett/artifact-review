"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useRouter } from "next/navigation";

const MD_TO_ROUTE: Record<string, string> = {
  "privacy-policy.md": "/privacy",
  "terms-of-service.md": "/terms",
  "acceptable-use-policy.md": "/acceptable-use",
  "cookie-policy.md": "/cookies",
  "dmca-policy.md": "/dmca",
  "ccpa-notice.md": "/ccpa",
};

interface LegalContentProps {
  content: string;
}

export function LegalContent({ content }: LegalContentProps) {
  const router = useRouter();

  return (
    <article
      className={[
        "prose prose-gray max-w-none",
        "prose-headings:text-gray-900",
        "prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline",
        "prose-code:bg-gray-100 prose-code:text-purple-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2",
        "prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a({ children, href, ...props }) {
            if (href && !href.startsWith("http") && !href.startsWith("mailto:")) {
              const route = MD_TO_ROUTE[href];
              if (route) {
                return (
                  <a
                    href={route}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(route);
                    }}
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
