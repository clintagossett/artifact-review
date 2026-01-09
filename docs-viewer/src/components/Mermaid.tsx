import { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { Skeleton } from '@/components/ui/skeleton';

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
});

interface MermaidProps {
    chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const renderChart = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
                const { svg: renderedSvg } = await mermaid.render(id, chart);

                if (isMounted) {
                    setSvg(renderedSvg);
                    setIsRendered(true);
                }
            } catch (err) {
                console.error('Mermaid render error:', err);
                if (isMounted) {
                    setError('Failed to render Mermaid diagram. Please check the syntax.');
                }
            }
        };

        renderChart();

        return () => {
            isMounted = false;
        };
    }, [chart]);

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
                <p className="text-red-600 text-sm font-medium">{error}</p>
                <pre className="mt-2 text-xs text-red-500 overflow-x-auto whitespace-pre-wrap">
                    {chart}
                </pre>
            </div>
        );
    }

    if (!isRendered) {
        return <Skeleton className="w-full h-64 my-4" />;
    }

    return (
        <div
            className="mermaid-container flex justify-center bg-white p-4 my-4 border border-gray-100 rounded-lg shadow-sm overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
