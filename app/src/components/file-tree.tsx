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
}

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  onSelect: (file: FileNode) => void
  selectedFileId?: string
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, depth, onSelect, selectedFileId }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const isSelected = selectedFileId === node.id

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === "folder") {
      setIsOpen(!isOpen)
    } else {
      onSelect(node)
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer hover:bg-muted/50 text-sm select-none",
          isSelected && "bg-muted text-foreground font-medium",
          depth > 0 && `pl-[${(depth * 12) + 8}px]` // Dynamic padding based on depth
        )}
        style={{ paddingLeft: `${depth * 1.2 + 0.5}rem` }} // Fallback / alternative to dynamic tailwind classes which might be purged
        onClick={handleClick}
      >
        <span className="mr-1 opacity-70">
          {node.type === "folder" ? (
             isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="w-4 inline-block" /> // Spacer for alignment
          )}
        </span>
        
        <span className="mr-2 text-muted-foreground">
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ data, onSelectFile, selectedFileId }: FileTreeProps) {
  return (
    <div className="w-full">
      {data.map((node) => (
        <FileTreeNode
          key={node.id}
          node={node}
          depth={0}
          onSelect={onSelectFile}
          selectedFileId={selectedFileId}
        />
      ))}
    </div>
  )
}
