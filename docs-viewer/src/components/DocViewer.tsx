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
                    },
                        // Custom heading renderers to support deep linking
                        h1: ({children, ...props }) => <HeadingTag tag="h1" {...props}>{children}</HeadingTag>,
                h2: ({children, ...props }) => <HeadingTag tag="h2" {...props}>{children}</HeadingTag>,
                h3: ({children, ...props }) => <HeadingTag tag="h3" {...props}>{children}</HeadingTag>,
                h4: ({children, ...props }) => <HeadingTag tag="h4" {...props}>{children}</HeadingTag>,
                h5: ({children, ...props }) => <HeadingTag tag="h5" {...props}>{children}</HeadingTag>,
                h6: ({children, ...props }) => <HeadingTag tag="h6" {...props}>{children}</HeadingTag>
                    }}
                >
                {content}
            </ReactMarkdown>
        </div>
    </div >
    );
}

// Helper component for headings with copy-on-click
function HeadingTag({ tag, children, id, ...props }: { tag: keyof JSX.IntrinsicElements, children: React.ReactNode, id?: string } & React.HTMLAttributes<HTMLHeadingElement>) {
    const [showCopied, setShowCopied] = useState(false);
    const Tag = tag as any;

    // Generate ID if missing (fallback)
    const getTextFromChildren = (children: React.ReactNode): string => {
        if (typeof children === 'string') return children;
        if (typeof children === 'number') return String(children);
        if (Array.isArray(children)) return children.map(getTextFromChildren).join('');
        if (typeof children === 'object' && children && 'props' in children) return getTextFromChildren((children as any).props.children);
        return '';
    };

    const effectiveId = id || getTextFromChildren(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

    const handleCopyLink = (e: React.MouseEvent) => {
        e.preventDefault();
        if (effectiveId) {
            const url = new URL(window.location.href);
            url.hash = effectiveId;

            const copyToClipboard = async () => {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(url.toString());
                    } else {
                        // Fallback for insecure contexts
                        const textArea = document.createElement("textarea");
                        textArea.value = url.toString();
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                    }
                    setShowCopied(true);
                    setTimeout(() => setShowCopied(false), 2000);
                } catch (err) {
                    console.error("Failed to copy link: ", err);
                }
            };

            copyToClipboard();

            // Also update URL without scrolling if possible, or just push state
            window.history.pushState(null, '', url.toString());

            // Scroll to view
            const element = document.getElementById(effectiveId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <Tag
            id={id}
            {...props}
            className={cn("group relative flex items-center gap-2 cursor-pointer no-underline", props.className)}
            onClick={handleCopyLink}
        >
            {children}
            <span className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 font-normal text-sm ml-2 select-none",
                showCopied && "opacity-100 text-green-500"
            )}>
                {showCopied ? "Copied!" : "#"}
            </span>
        </Tag>
    );
}
