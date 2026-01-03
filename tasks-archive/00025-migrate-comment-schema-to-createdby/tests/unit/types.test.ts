/**
 * Type safety tests to verify Comment and Reply types
 * These tests ensure the createdBy field is properly typed
 */
import { describe, it, expect } from 'vitest';
import type { Comment, Reply } from '@/components/comments/types';

describe('Comment and Reply Type Safety', () => {
  describe('Comment type shape', () => {
    it('should accept createdBy field', () => {
      const comment: Comment = {
        id: 'test-id',
        versionId: 'version-id',
        createdBy: 'user-id',
        author: { name: 'Test User', avatar: 'TU' },
        content: 'Test comment',
        timestamp: '2026-01-03',
        resolved: false,
        replies: [],
      };
      expect(comment.createdBy).toBe('user-id');
    });

    it('should allow createdBy to be optional', () => {
      const comment: Comment = {
        id: 'test-id',
        versionId: 'version-id',
        author: { name: 'Test User', avatar: 'TU' },
        content: 'Test comment',
        timestamp: '2026-01-03',
        resolved: false,
        replies: [],
      };
      expect(comment.createdBy).toBeUndefined();
    });

    it('should accept all optional fields including elementType and location', () => {
      const comment: Comment = {
        id: 'test-id',
        versionId: 'version-id',
        createdBy: 'user-id',
        author: { name: 'Test User', avatar: 'TU' },
        content: 'Test comment',
        timestamp: '2026-01-03',
        resolved: false,
        replies: [],
        highlightedText: 'selected text',
        elementType: 'image',
        elementId: 'img-123',
        elementPreview: 'https://example.com/image.png',
        page: '/index.html',
        location: {
          type: 'visible',
          label: '',
          isHidden: false,
        },
      };
      expect(comment.elementType).toBe('image');
    });
  });

  describe('Reply type shape', () => {
    it('should accept createdBy field', () => {
      const reply: Reply = {
        id: 'reply-id',
        createdBy: 'user-id',
        author: { name: 'Reply Author', avatar: 'RA' },
        content: 'Reply content',
        timestamp: '2026-01-03',
      };
      expect(reply.createdBy).toBe('user-id');
    });

    it('should allow createdBy to be optional', () => {
      const reply: Reply = {
        id: 'reply-id',
        author: { name: 'Reply Author', avatar: 'RA' },
        content: 'Reply content',
        timestamp: '2026-01-03',
      };
      expect(reply.createdBy).toBeUndefined();
    });
  });
});
