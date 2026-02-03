/**
 * Tests for Novu Comment Workflow
 *
 * These tests verify the workflow structure, payload validation,
 * and content generation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  commentWorkflow,
  generateInAppSubject,
  generateInAppBody,
  generateInAppContent,
  generateEmailSubject,
  generateEmailBody,
  generateEventHtml,
  getDigestInterval,
  type CommentPayload,
  type CommentEvent,
} from "@/app/api/novu/workflows/comment-workflow";
// Import zod from the workflow module's path to ensure resolution
import { z } from "../../../../../app/node_modules/zod";

// Define the payload schema for testing (mirrors the schema in the workflow)
const commentPayloadSchema = z.object({
  artifactDisplayTitle: z.string(),
  authorName: z.string(),
  authorAvatarUrl: z.string().optional(),
  commentPreview: z.string(),
  artifactUrl: z.string(),
  isReply: z.boolean().optional(),
  isCommentAuthor: z.boolean().optional(),
});

describe("Comment Workflow - Structure", () => {
  describe("Test 1.1: Workflow Export", () => {
    it("should export commentWorkflow from comment-workflow.ts", () => {
      expect(commentWorkflow).toBeDefined();
    });
  });

  describe("Test 1.2: Workflow Name", () => {
    it("should have correct workflow name 'new-comment'", () => {
      // The workflow function from @novu/framework returns an object with an id property
      expect(commentWorkflow).toHaveProperty("id", "new-comment");
    });
  });

  describe("Test 1.3: Workflow Functions", () => {
    it("should have trigger and discover functions", () => {
      // The Novu workflow object has id, trigger, and discover methods
      expect(commentWorkflow).toHaveProperty("id");
      expect(commentWorkflow).toHaveProperty("trigger");
      expect(commentWorkflow).toHaveProperty("discover");

      // Verify they are functions
      expect(typeof commentWorkflow.trigger).toBe("function");
      expect(typeof commentWorkflow.discover).toBe("function");
    });
  });
});

describe("Comment Workflow - Payload Validation (Test 5.x)", () => {
  describe("Test 5.1: Valid payload passes schema validation", () => {
    it("should accept valid payload with all required fields", () => {
      const validPayload = {
        artifactDisplayTitle: "My Design Document",
        authorName: "John Doe",
        commentPreview: "This looks great!",
        artifactUrl: "https://example.com/artifact/123",
      };

      const result = commentPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should accept valid payload with all optional fields", () => {
      const validPayload = {
        artifactDisplayTitle: "My Design Document",
        authorName: "John Doe",
        commentPreview: "This looks great!",
        artifactUrl: "https://example.com/artifact/123",
        authorAvatarUrl: "https://example.com/avatar.png",
        isReply: true,
        isCommentAuthor: true,
      };

      const result = commentPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe("Test 5.2: Missing required fields rejected", () => {
    it("should reject payload missing artifactDisplayTitle", () => {
      const invalidPayload = {
        authorName: "John Doe",
        commentPreview: "This looks great!",
        artifactUrl: "https://example.com/artifact/123",
      };

      const result = commentPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should reject payload missing authorName", () => {
      const invalidPayload = {
        artifactDisplayTitle: "My Design Document",
        commentPreview: "This looks great!",
        artifactUrl: "https://example.com/artifact/123",
      };

      const result = commentPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should reject payload missing commentPreview", () => {
      const invalidPayload = {
        artifactDisplayTitle: "My Design Document",
        authorName: "John Doe",
        artifactUrl: "https://example.com/artifact/123",
      };

      const result = commentPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should reject payload missing artifactUrl", () => {
      const invalidPayload = {
        artifactDisplayTitle: "My Design Document",
        authorName: "John Doe",
        commentPreview: "This looks great!",
      };

      const result = commentPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("Test 5.3: Optional fields are truly optional", () => {
    it("should accept payload without isReply", () => {
      const payload = {
        artifactDisplayTitle: "My Design Document",
        authorName: "John Doe",
        commentPreview: "This looks great!",
        artifactUrl: "https://example.com/artifact/123",
      };

      const result = commentPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isReply).toBeUndefined();
      }
    });

    it("should accept payload without isCommentAuthor", () => {
      const payload = {
        artifactDisplayTitle: "My Design Document",
        authorName: "John Doe",
        commentPreview: "This looks great!",
        artifactUrl: "https://example.com/artifact/123",
      };

      const result = commentPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isCommentAuthor).toBeUndefined();
      }
    });

    it("should accept payload without authorAvatarUrl", () => {
      const payload = {
        artifactDisplayTitle: "My Design Document",
        authorName: "John Doe",
        commentPreview: "This looks great!",
        artifactUrl: "https://example.com/artifact/123",
      };

      const result = commentPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.authorAvatarUrl).toBeUndefined();
      }
    });
  });
});

// Test fixtures
const basePayload: CommentPayload = {
  artifactDisplayTitle: "My Design Document",
  authorName: "John Doe",
  commentPreview: "This looks great!",
  artifactUrl: "https://example.com/artifact/123",
};

describe("Comment Workflow - In-App Notification Content (Test 2.x)", () => {
  describe("Test 2.1: New comment generates correct subject", () => {
    it("should generate 'New comment on {artifactTitle}' for new comments", () => {
      const subject = generateInAppSubject(basePayload, false, false);
      expect(subject).toBe("New comment on My Design Document");
    });
  });

  describe("Test 2.2: Reply to comment author generates correct subject", () => {
    it("should generate '{authorName} replied to your comment' for reply to author", () => {
      const subject = generateInAppSubject(basePayload, true, true);
      expect(subject).toBe("John Doe replied to your comment");
    });
  });

  describe("Test 2.3: Reply to thread participant generates correct subject", () => {
    it("should generate 'New reply on {artifactTitle}' for reply to non-author", () => {
      const subject = generateInAppSubject(basePayload, true, false);
      expect(subject).toBe("New reply on My Design Document");
    });
  });

  describe("Test 2.4: Avatar URL is passed through correctly", () => {
    it("should include avatar URL in in-app content", () => {
      const payloadWithAvatar: CommentPayload = {
        ...basePayload,
        authorAvatarUrl: "https://example.com/avatar.png",
      };

      const content = generateInAppContent(payloadWithAvatar);
      expect(content.avatar).toBe("https://example.com/avatar.png");
    });

    it("should handle missing avatar URL gracefully", () => {
      const content = generateInAppContent(basePayload);
      expect(content.avatar).toBeUndefined();
    });
  });

  describe("Test 2.5: Primary action URL points to artifact", () => {
    it("should include artifact URL as primary action for comment", () => {
      const payloadAsComment: CommentPayload = {
        ...basePayload,
        isReply: false,
      };

      const content = generateInAppContent(payloadAsComment);
      expect(content.primaryAction.url).toBe("https://example.com/artifact/123");
      expect(content.primaryAction.label).toBe("View Comment");
    });

    it("should include artifact URL as primary action for reply", () => {
      const payloadAsReply: CommentPayload = {
        ...basePayload,
        isReply: true,
      };

      const content = generateInAppContent(payloadAsReply);
      expect(content.primaryAction.url).toBe("https://example.com/artifact/123");
      expect(content.primaryAction.label).toBe("View Reply");
    });
  });

  describe("Body content generation", () => {
    it("should generate correct body for new comment", () => {
      const body = generateInAppBody(basePayload, false);
      expect(body).toBe('John Doe commented: "This looks great!"');
    });

    it("should generate correct body for reply", () => {
      const body = generateInAppBody(basePayload, true);
      expect(body).toBe('John Doe replied: "This looks great!"');
    });
  });
});

describe("Comment Workflow - Email Digest Content (Test 3.x)", () => {
  describe("Test 3.1: Single comment generates correct email subject", () => {
    it("should generate 'New comment from {author} on {artifact}' for single comment", () => {
      const events: CommentEvent[] = [{ ...basePayload, isReply: false }];
      const subject = generateEmailSubject(events, basePayload, false);
      expect(subject).toBe("New comment from John Doe on My Design Document");
    });
  });

  describe("Test 3.2: Single reply generates correct email subject", () => {
    it("should generate '{author} replied on {artifact}' for single reply", () => {
      const events: CommentEvent[] = [{ ...basePayload, isReply: true }];
      const subject = generateEmailSubject(events, basePayload, true);
      expect(subject).toBe("John Doe replied on My Design Document");
    });
  });

  describe("Test 3.3: Multiple comments generates plural subject", () => {
    it("should generate '3 comments on {artifact}' for 3 comments", () => {
      const events: CommentEvent[] = [
        { ...basePayload, isReply: false },
        { ...basePayload, authorName: "Jane Doe", isReply: false },
        { ...basePayload, authorName: "Bob Smith", isReply: false },
      ];
      const subject = generateEmailSubject(events, basePayload, false);
      expect(subject).toBe("3 comments on My Design Document");
    });

    it("should generate '2 comments on {artifact}' for 2 comments", () => {
      const events: CommentEvent[] = [
        { ...basePayload, isReply: false },
        { ...basePayload, authorName: "Jane Doe", isReply: false },
      ];
      const subject = generateEmailSubject(events, basePayload, false);
      expect(subject).toBe("2 comments on My Design Document");
    });
  });

  describe("Test 3.4: Mixed comments/replies generates combined subject", () => {
    it("should generate '2 comments and 1 reply on {artifact}' for mixed", () => {
      const events: CommentEvent[] = [
        { ...basePayload, isReply: false },
        { ...basePayload, authorName: "Jane Doe", isReply: false },
        { ...basePayload, authorName: "Bob Smith", isReply: true },
      ];
      const subject = generateEmailSubject(events, basePayload, false);
      expect(subject).toBe("2 comments and 1 reply on My Design Document");
    });

    it("should generate '1 comment and 2 replies on {artifact}' for mixed", () => {
      const events: CommentEvent[] = [
        { ...basePayload, isReply: false },
        { ...basePayload, authorName: "Jane Doe", isReply: true },
        { ...basePayload, authorName: "Bob Smith", isReply: true },
      ];
      const subject = generateEmailSubject(events, basePayload, false);
      expect(subject).toBe("1 comment and 2 replies on My Design Document");
    });

    it("should use plural 'replies' for 3+ replies", () => {
      const events: CommentEvent[] = [
        { ...basePayload, isReply: true },
        { ...basePayload, authorName: "Jane Doe", isReply: true },
        { ...basePayload, authorName: "Bob Smith", isReply: true },
      ];
      const subject = generateEmailSubject(events, basePayload, true);
      expect(subject).toBe("3 replies on My Design Document");
    });
  });

  describe("Test 3.5: Email body contains all digested events", () => {
    it("should include all events in email body", () => {
      const events: CommentEvent[] = [
        { ...basePayload, commentPreview: "First comment" },
        { ...basePayload, authorName: "Jane Doe", commentPreview: "Second comment" },
      ];
      const body = generateEmailBody(events, basePayload, false);

      expect(body).toContain("First comment");
      expect(body).toContain("Second comment");
      expect(body).toContain("John Doe");
      expect(body).toContain("Jane Doe");
    });

    it("should show '2 New Updates' header for multiple events", () => {
      const events: CommentEvent[] = [
        { ...basePayload },
        { ...basePayload, authorName: "Jane Doe" },
      ];
      const body = generateEmailBody(events, basePayload, false);
      expect(body).toContain("2 New Updates");
    });

    it("should show 'New Comment' header for single comment", () => {
      const events: CommentEvent[] = [{ ...basePayload, isReply: false }];
      const body = generateEmailBody(events, basePayload, false);
      expect(body).toContain("New Comment");
    });

    it("should show 'New Reply' header for single reply", () => {
      const events: CommentEvent[] = [{ ...basePayload, isReply: true }];
      const body = generateEmailBody(events, basePayload, true);
      expect(body).toContain("New Reply");
    });
  });

  describe("Test 3.6: Each event has author name, preview text, and view link", () => {
    it("should include author name in event HTML", () => {
      const event: CommentEvent = { ...basePayload, authorName: "Test Author" };
      const html = generateEventHtml(event);
      expect(html).toContain("<strong>Test Author</strong>");
    });

    it("should include comment preview in event HTML", () => {
      const event: CommentEvent = { ...basePayload, commentPreview: "Test preview text" };
      const html = generateEventHtml(event);
      expect(html).toContain("Test preview text");
    });

    it("should include view link in event HTML", () => {
      const event: CommentEvent = { ...basePayload, artifactUrl: "https://test.com/view" };
      const html = generateEventHtml(event);
      expect(html).toContain('href="https://test.com/view"');
      expect(html).toContain("View");
    });

    it("should indicate 'commented' for non-reply events", () => {
      const event: CommentEvent = { ...basePayload, isReply: false };
      const html = generateEventHtml(event);
      expect(html).toContain("commented");
      expect(html).not.toContain("replied");
    });

    it("should indicate 'replied' for reply events", () => {
      const event: CommentEvent = { ...basePayload, isReply: true };
      const html = generateEventHtml(event);
      expect(html).toContain("replied");
    });
  });

  describe("Email body includes artifact link", () => {
    it("should include View Artifact button with correct URL", () => {
      const events: CommentEvent[] = [basePayload];
      const body = generateEmailBody(events, basePayload, false);
      expect(body).toContain('href="https://example.com/artifact/123"');
      expect(body).toContain("View Artifact");
    });
  });
});

describe("Comment Workflow - Digest Configuration (Test 4.x)", () => {
  const originalEnv = process.env.NOVU_DIGEST_INTERVAL;

  beforeEach(() => {
    // Reset env var before each test
    delete process.env.NOVU_DIGEST_INTERVAL;
  });

  afterEach(() => {
    // Restore original env var
    if (originalEnv !== undefined) {
      process.env.NOVU_DIGEST_INTERVAL = originalEnv;
    } else {
      delete process.env.NOVU_DIGEST_INTERVAL;
    }
  });

  describe("Test 4.1: Default digest interval is 10 minutes", () => {
    it("should return 10 minutes as default digest interval", () => {
      const config = getDigestInterval();
      expect(config.amount).toBe(10);
      expect(config.unit).toBe("minutes");
    });
  });

  describe("Test 4.2: NOVU_DIGEST_INTERVAL env var overrides default", () => {
    it("should use NOVU_DIGEST_INTERVAL when set to 5", () => {
      process.env.NOVU_DIGEST_INTERVAL = "5";
      const config = getDigestInterval();
      expect(config.amount).toBe(5);
    });

    it("should use NOVU_DIGEST_INTERVAL when set to 30", () => {
      process.env.NOVU_DIGEST_INTERVAL = "30";
      const config = getDigestInterval();
      expect(config.amount).toBe(30);
    });

    it("should use NOVU_DIGEST_INTERVAL when set to 1 for testing", () => {
      process.env.NOVU_DIGEST_INTERVAL = "1";
      const config = getDigestInterval();
      expect(config.amount).toBe(1);
    });
  });

  describe("Test 4.3: Digest unit is 'minutes'", () => {
    it("should always use 'minutes' as the digest unit", () => {
      const config = getDigestInterval();
      expect(config.unit).toBe("minutes");
    });

    it("should use 'minutes' even when env var is set", () => {
      process.env.NOVU_DIGEST_INTERVAL = "15";
      const config = getDigestInterval();
      expect(config.unit).toBe("minutes");
    });
  });
});
