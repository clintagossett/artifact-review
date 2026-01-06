"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import dynamic from 'next/dynamic';

const Mermaid = dynamic(() => import('./Mermaid').then(mod => mod.Mermaid), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-64 my-4" />
});

export interface MarkdownViewerProps {
  /** URL to fetch markdown content from */
  src: string;
  /** Loading state passed from parent */
  isLoading?: boolean;
  /** Optional CSS class for container */
  className?: string;
}

export function MarkdownViewer({ src, isLoading = false, className }: MarkdownViewerProps) {
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!isLoading);

  useEffect(() => {
    // If parent passes isLoading, respect it
    if (isLoading) {
      setLoading(true);
      return;
    }

    // Fetch markdown content
    const fetchContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(src);

        if (!response.ok) {
          throw new Error(`Failed to load markdown: ${response.statusText}`);
        }

        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load markdown content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [src, isLoading]);

  // Show loading skeleton
  if (loading || isLoading) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center bg-gray-50', className)}>
        <div className="space-y-4 w-full p-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center bg-gray-50', className)}>
        <div className="text-center p-6">
          <p className="text-red-600 font-semibold mb-2">Failed to load markdown</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Render markdown content with Tailwind typography
  return (
    <div
      className={cn(
        'prose prose-gray max-w-none',
        'prose-headings:text-gray-900',
        'prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline',
        'prose-code:bg-gray-100 prose-code:text-purple-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
        'prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200',
        'prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2',
        'prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2',
        'p-6',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';

            if (lang === 'mermaid') {
              return <Mermaid chart={String(children).replace(/\n$/, '')} />;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
