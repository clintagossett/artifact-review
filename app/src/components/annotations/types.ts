import type { Id } from '@/convex/_generated/dataModel';
import type { AnnotationTarget } from '@/lib/annotation/types';

export interface Author {
    name: string;
    avatar: string;
    id?: string;
}

export interface Reply {
    id: string;
    content: string;
    author: Author;
    createdAt: number;
    createdBy: string;
}

export interface AnnotationDisplay {
    id: string;
    versionId: string;
    content: string;

    // User info
    author: Author;
    createdBy: string;
    createdAt: number;

    // Status
    resolved: boolean;
    isEdited: boolean;
    editedAt?: number;

    // The core annotation data
    target: AnnotationTarget;
    style?: "comment" | "strike"; // derived from bodyValue or metadata

    // Replies
    replies: Reply[];
}
