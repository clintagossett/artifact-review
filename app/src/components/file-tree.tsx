"use client"

import React, { useState } from "react"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FileNode {
  id: string
  name: string
  type: "file" | "folder"
  children?: FileNode[]
  content?: string
}

interface FileTreeProps {
  data: FileNode[]
  onSelectFile: (file: FileNode) => void
  selectedFileId?: string
  expandedIds?: Set<string>
  onToggleExpand?: (id: string) => void
}

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  onSelect: (file: FileNode) => void
  selectedFileId?: string
  expandedIds?: Set<string>
  onToggleExpand?: (id: string) => void
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  onSelect,
  selectedFileId,
  expandedIds,
  onToggleExpand
}) => {
  // Fallback to local state if no controlled props provided (for backward compatibility if needed, though we'll update usage)
  const [localIsOpen, setLocalIsOpen] = useState(false)

  const isControlled = expandedIds !== undefined
  const isOpen = isControlled ? expandedIds.has(node.id) : localIsOpen

  const isSelected = selectedFileId === node.id

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === "folder") {
      if (isControlled && onToggleExpand) {
        onToggleExpand(node.id)
      } else {
        setLocalIsOpen(!localIsOpen)
      }
    } else {
      onSelect(node)
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer hover:bg-muted/50 text-sm select-none rounded-r-md border-l-2 border-transparent",
          isSelected && "bg-blue-50 text-blue-700 font-semibold border-blue-500",
          // depth > 0 && `pl-[${(depth * 12) + 8}px]` // Dynamic padding handled by style below
        )}
        style={{ paddingLeft: `${depth * 1.2 + 0.5}rem` }}
        onClick={handleClick}
      >
        <span className={cn("mr-1 opacity-70", isSelected && "opacity-100 text-blue-500")}>
          {node.type === "folder" ? (
            isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="w-4 inline-block" />
          )}
        </span>

        <span className={cn("mr-2 text-muted-foreground", isSelected && "text-blue-600")}>
          {node.type === "folder" ? (
            isOpen ? <FolderOpen className="h-4 w-4 text-blue-400" /> : <Folder className="h-4 w-4 text-blue-400" />
          ) : (
            <File className="h-4 w-4" />
          )}
        </span>

        <span className="truncate">{node.name}</span>
      </div>

      {isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedFileId={selectedFileId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({
  data,
  onSelectFile,
  selectedFileId,
  expandedIds,
  onToggleExpand
}: FileTreeProps) {
  return (
    <div className="w-full">
      {data.map((node) => (
        <FileTreeNode
          key={node.id}
          node={node}
          depth={0}
          onSelect={onSelectFile}
          selectedFileId={selectedFileId}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  )
}
