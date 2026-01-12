import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Mermaid } from './Mermaid';
import { useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface DocViewerProps {
    /** Relative path to the doc file */
    path: string;
}

export function DocViewer({ path }: DocViewerProps) {
    const [content, setContent] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            setError(null);

            try {
                // Path already includes root dir (docs/ or tasks/)
                const src = `/${path}`;
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

        if (path) {
            fetchContent();
        }
    }, [path]);

    // Handle internal anchors and relative links
    useEffect(() => {
        if (!loading && window.location.hash) {
            const id = window.location.hash.substring(1);
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [loading, path]);

    if (loading) {
        return (
            <div className="w-full h-full p-6 space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center p-6 text-center">
                <div>
                    <p className="text-red-600 font-semibold mb-2">Failed to load document</p>
                    <p className="text-gray-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div
                className={cn(
                    'prose prose-slate max-w-none',
                    'prose-headings:scroll-mt-20',
                    'font-[450]',
                    'prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
                    'prose-code:bg-gray-100 prose-code:text-blue-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
                    'prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200',
                    'prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2',
                    'prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2',
                )}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug]}
                    components={{
                        a({ node, className, children, href, ...props }) {
                            const isExternal = href?.startsWith('http');
                            const isAnchor = href?.startsWith('#');

                            if (href && !isExternal && !isAnchor) {
                                // Handle relative links to other docs
                                return (
                                    <a
                                        href={href}
                                        className={className}
                                        onClick={(e) => {
                                            e.preventDefault();

                                            // Resolve the path relative to the current document
                                            const currentPathParts = path.split('/');
                                            const dirParts = currentPathParts.slice(0, -1);
                                            const hrefParts = href.split('/');

                                            const resultParts = [...dirParts];
                                            for (const part of hrefParts) {
                                                if (part === '.' || part === '') continue;
                                                if (part === '..') {
                                                    resultParts.pop();
                                                } else {
                                                    resultParts.push(part);
                                                }
                                            }

                                            let finalPath = resultParts.join('/');

                                            // If it points to a directory (no extension), append _index.md
                                            if (!finalPath.endsWith('.md')) {
                                                finalPath = finalPath.replace(/\/$/, '') + '/_index.md';
                                            }

                                            navigate(`/view/${finalPath.replace(/^\//, '')}`);
                                        }}
                                        {...props}
                                    >
                                        {children}
                                    </a>
                                );
                            }

                            return (
                                <a href={href} className={className} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} {...props}>
                                    {children}
                                </a>
                            );
                        },
                        code({ node, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const lang = match ? match[1] : '';

                            if (lang === 'mermaid') {
                                return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                            }

                            if (match) {
                                return (
                                    <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={lang}
                                        PreTag="div"
                                        className="rounded-md my-4 not-prose text-sm"
                                        customStyle={{
                                            margin: 0,
                                            padding: '1rem',
                                            backgroundColor: '#1e1e1e'
                                        }}
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                );
                            }

                            return (
                                <code className={cn("bg-gray-100 text-blue-700 px-1 py-0.5 rounded", className)} {...props}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
