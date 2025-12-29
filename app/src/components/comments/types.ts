// Comment and collaboration types for Phase 1 (Frontend only with mock data)

export interface Author {
  name: string;
  avatar: string;
}

export interface Reply {
  id: string;
  author: Author;
  content: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  versionId: string;
  authorId?: string; // For permission checks (optional for mock comments)
  author: Author;
  content: string;
  timestamp: string;
  resolved: boolean;
  replies: Reply[];
  highlightedText?: string;
  elementType?: 'text' | 'image' | 'heading' | 'button' | 'section';
  elementId?: string;
  elementPreview?: string;
  page?: string;
  location?: ElementLocation;
}

export interface ElementLocation {
  type: 'tab' | 'accordion' | 'visible';
  label: string;
  isHidden: boolean;
}

export interface TextEdit {
  id: string;
  author: Author;
  type: 'delete' | 'replace';
  originalText: string;
  newText?: string;
  comment: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ActiveViewer {
  name: string;
  avatar: string;
  color: string;
  lastActive: number;
  viewingElement?: string;
}

export interface Version {
  id: string;
  number: number;
  fileName: string;
  entryPoint?: string;
  uploadedAt: string;
  uploadedBy: string;
  label?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  versions: Version[];
  members: { name: string; avatar: string }[];
  lastActivity: string;
  status: 'active' | 'archived';
}

export type ToolMode = 'comment' | 'text-edit' | null;
export type ToolBadge = 'one-shot' | 'infinite' | null;
export type FilterMode = 'all' | 'resolved' | 'unresolved';
