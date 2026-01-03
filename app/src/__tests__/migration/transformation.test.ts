/**
 * Tests for transforming backend data to frontend format
 * Verifies the createdBy field is correctly mapped
 */
import { describe, it, expect } from 'vitest';

describe('Comment and Reply Transformation', () => {
  describe('Comment Transformation', () => {
    it('should map backend createdBy to frontend comment', () => {
      const backendComment = {
        _id: 'comment-123',
        versionId: 'version-456',
        createdBy: 'user-789', // Backend field name
        author: { name: 'Test User', email: 'test@example.com' },
        content: 'Test content',
        createdAt: 1704326400000,
        resolved: false,
        target: {
          _version: 1,
          type: 'text' as const,
          selectedText: 'highlighted text',
          page: '/index.html',
        },
      };

      const transformed = {
        id: backendComment._id,
        versionId: backendComment.versionId,
        createdBy: backendComment.createdBy, // Should use createdBy, not authorId
        author: {
          name: backendComment.author.name || 'Anonymous',
          avatar: (backendComment.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: backendComment.content,
        timestamp: new Date(backendComment.createdAt).toLocaleString(),
        resolved: backendComment.resolved,
        replies: [],
        highlightedText: backendComment.target?.selectedText,
        page: backendComment.target?.page,
      };

      expect(transformed.createdBy).toBe('user-789');
      expect(transformed.author.name).toBe('Test User');
      expect(transformed.author.avatar).toBe('TE');
    });

    it('should handle element type comments with elementId', () => {
      const backendComment = {
        _id: 'comment-123',
        versionId: 'version-456',
        createdBy: 'user-789',
        author: { name: 'Test User', email: 'test@example.com' },
        content: 'Test content',
        createdAt: 1704326400000,
        resolved: false,
        target: {
          _version: 1,
          type: 'element' as const,
          elementId: 'img-hero',
          selectedText: undefined,
          page: '/index.html',
        },
      };

      const transformed = {
        id: backendComment._id,
        versionId: backendComment.versionId,
        createdBy: backendComment.createdBy,
        author: {
          name: backendComment.author.name || 'Anonymous',
          avatar: (backendComment.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: backendComment.content,
        timestamp: new Date(backendComment.createdAt).toLocaleString(),
        resolved: backendComment.resolved,
        replies: [],
        elementType: backendComment.target?.type === 'element'
          ? (backendComment.target.elementId ? 'section' : 'text')
          : 'text',
        elementId: backendComment.target?.elementId,
        highlightedText: backendComment.target?.selectedText,
        page: backendComment.target?.page,
      };

      expect(transformed.createdBy).toBe('user-789');
      expect(transformed.elementType).toBe('section');
      expect(transformed.elementId).toBe('img-hero');
    });

    it('should handle anonymous authors', () => {
      const backendComment = {
        _id: 'comment-123',
        versionId: 'version-456',
        createdBy: 'user-789',
        author: { name: undefined, email: undefined },
        content: 'Test content',
        createdAt: 1704326400000,
        resolved: false,
      };

      const transformed = {
        id: backendComment._id,
        versionId: backendComment.versionId,
        createdBy: backendComment.createdBy,
        author: {
          name: backendComment.author.name || 'Anonymous',
          avatar: (backendComment.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: backendComment.content,
        timestamp: new Date(backendComment.createdAt).toLocaleString(),
        resolved: backendComment.resolved,
        replies: [],
      };

      expect(transformed.author.name).toBe('Anonymous');
      expect(transformed.author.avatar).toBe('A'); // 'A' is used as fallback, not 'AN'
    });
  });

  describe('Reply Transformation', () => {
    it('should map backend createdBy to frontend reply', () => {
      const backendReply = {
        _id: 'reply-123',
        commentId: 'comment-456',
        createdBy: 'user-789', // Backend field name
        author: { name: 'Reply Author', email: 'reply@example.com' },
        content: 'Reply content',
        createdAt: 1704326400000,
      };

      const transformed = {
        id: backendReply._id,
        createdBy: backendReply.createdBy, // Should use createdBy, not authorId
        author: {
          name: backendReply.author.name || 'Anonymous',
          avatar: (backendReply.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: backendReply.content,
        timestamp: new Date(backendReply.createdAt).toLocaleString(),
      };

      expect(transformed.createdBy).toBe('user-789');
      expect(transformed.author.name).toBe('Reply Author');
      expect(transformed.author.avatar).toBe('RE');
    });

    it('should handle anonymous reply authors', () => {
      const backendReply = {
        _id: 'reply-123',
        commentId: 'comment-456',
        createdBy: 'user-789',
        author: { name: undefined, email: undefined },
        content: 'Reply content',
        createdAt: 1704326400000,
      };

      const transformed = {
        id: backendReply._id,
        createdBy: backendReply.createdBy,
        author: {
          name: backendReply.author.name || 'Anonymous',
          avatar: (backendReply.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: backendReply.content,
        timestamp: new Date(backendReply.createdAt).toLocaleString(),
      };

      expect(transformed.author.name).toBe('Anonymous');
      expect(transformed.author.avatar).toBe('A'); // 'A' is used as fallback, not 'AN'
    });

    it('should transform multiple replies correctly', () => {
      const backendReplies = [
        {
          _id: 'reply-1',
          commentId: 'comment-456',
          createdBy: 'user-789',
          author: { name: 'User One', email: 'one@example.com' },
          content: 'First reply',
          createdAt: 1704326400000,
        },
        {
          _id: 'reply-2',
          commentId: 'comment-456',
          createdBy: 'user-999',
          author: { name: 'User Two', email: 'two@example.com' },
          content: 'Second reply',
          createdAt: 1704326500000,
        },
      ];

      const transformed = backendReplies.map((br) => ({
        id: br._id,
        createdBy: br.createdBy,
        author: {
          name: br.author.name || 'Anonymous',
          avatar: (br.author.name || 'A').substring(0, 2).toUpperCase(),
        },
        content: br.content,
        timestamp: new Date(br.createdAt).toLocaleString(),
      }));

      expect(transformed).toHaveLength(2);
      expect(transformed[0].createdBy).toBe('user-789');
      expect(transformed[1].createdBy).toBe('user-999');
    });
  });
});
