import React, { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link, useLocation } from "react-router-dom"

export interface DocNode {
    name: string
    type: 'file' | 'directory'
    path: string
    children?: DocNode[]
    ext?: string
}

interface FileTreeProps {
    data: DocNode[]
}

interface FileTreeNodeProps {
    node: DocNode
    depth: number
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, depth }) => {
    const location = useLocation();
    const currentPath = decodeURIComponent(location.pathname).replace(/^\/view\//, '');

    // Folder is open if it contains the current path or if manually toggled
    const isChildActive = currentPath.startsWith(node.path + '/');
    const [isOpen, setIsOpen] = useState(isChildActive || depth < 1); // Open top-level folders by default

    useEffect(() => {
        if (isChildActive) {
            setIsOpen(true);
        }
    }, [isChildActive]);

    const isSelected = currentPath === node.path;

    const handleClick = (e: React.MouseEvent) => {
        if (node.type === "directory") {
            e.preventDefault();
            setIsOpen(!isOpen);
        }
    };

    const Icon = node.type === "directory"
        ? (isOpen ? FolderOpen : Folder)
        : FileText;

    const content = (
        <div
            className={cn(
                "flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 text-sm select-none rounded-md font-[450]",
                isSelected && "bg-blue-50 text-blue-700 font-medium",
                node.type === "directory" && "text-gray-700"
            )}
            style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
            onClick={handleClick}
        >
            <span className="mr-1 opacity-50">
                {node.type === "directory" ? (
                    isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                ) : (
                    <span className="w-4 inline-block" />
                )}
            </span>

            <Icon className={cn(
                "h-4 w-4 mr-2",
                node.type === "directory" ? "text-blue-400" : "text-gray-400"
            )} />

            <span className="truncate">{node.name}</span>
        </div>
    );

    return (
        <div>
            {node.type === "file" ? (
                <Link to={`/view/${node.path}`} className="block no-underline text-inherit">
                    {content}
                </Link>
            ) : (
                content
            )}

            {isOpen && node.children && (
                <div className="mt-1">
                    {node.children.map((child) => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FileTree({ data }: FileTreeProps) {
    return (
        <div className="space-y-1">
            {data.map((node) => (
                <FileTreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                />
            ))}
        </div>
    )
}
