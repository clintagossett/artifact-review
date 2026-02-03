"use client"

import { useState } from "react"
import { FileTree, FileNode } from "@/components/file-tree"
// We'll use a simple pre tag for now, or react-markdown if available.
import ReactMarkdown from "react-markdown"

const MOCK_FILE_SYSTEM: FileNode[] = [
    {
        id: "root-1",
        name: "docs",
        type: "folder",
        children: [
            {
                id: "doc-1",
                name: "introduction.md",
                type: "file",
                content: "# Introduction\n\nWelcome to the project documentation.\n\nThis is a sample markdown file."
            },
            {
                id: "doc-2",
                name: "getting-started.md",
                type: "file",
                content: "# Getting Started\n\n1. Install dependencies\n2. Run the server\n3. Enjoy!"
            },
            {
                id: "folder-2",
                name: "advanced",
                type: "folder",
                children: [
                    {
                        id: "doc-3",
                        name: "configuration.md",
                        type: "file",
                        content: "# Configuration\n\nHere are the advanced configuration options..."
                    }
                ]
            }
        ]
    },
    {
        id: "root-2",
        name: "README.md",
        type: "file",
        content: "# Project Root\n\nThis is the root readme file."
    }
]

export default function MultiFileTestPage() {
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)

    return (
        <div className="flex h-screen w-full bg-background">
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/10 overflow-y-auto">
                <div className="p-4 font-semibold text-lg border-b">
                    Files
                </div>
                <div className="py-2">
                    <FileTree
                        data={MOCK_FILE_SYSTEM}
                        onSelectFile={setSelectedFile}
                        selectedFileId={selectedFile?.id}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {selectedFile ? (
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-3xl font-bold mb-6 pb-2 border-b">{selectedFile.name}</h1>
                        <div className="prose dark:prose-invert max-w-none">
                            {/* Using ReactMarkdown for rendering */}
                            <ReactMarkdown>{selectedFile.content || ""}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        Select a file to view its content
                    </div>
                )}
            </div>
        </div>
    )
}
