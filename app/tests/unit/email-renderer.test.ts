/**
 * Unit Tests: Email Renderer
 *
 * Tests the email rendering utility functions:
 * - renderEmailTemplate() - Renders React Email templates to HTML
 * - generateEmailSubject() - Generates subject lines for each template type
 *
 * Task: 00071-novu-convex-resend-email-architecture
 */

import { describe, it, expect } from "vitest";

// Import the functions we're testing
// Note: These use "use node" directive, so we test in Node environment
import {
  renderEmailTemplate,
  generateEmailSubject,
  type EmailTemplate,
} from "../../convex/lib/emailRenderer";

describe("generateEmailSubject", () => {
  describe("comment-digest templates", () => {
    it("generates subject for single comment", () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "My Artifact",
        events: [
          {
            authorName: "John",
            commentPreview: "Great work!",
            artifactUrl: "https://example.com/a/123",
            isReply: false,
          },
        ],
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe("New comment from John on My Artifact");
    });

    it("generates subject for single reply", () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "My Artifact",
        events: [
          {
            authorName: "Jane",
            commentPreview: "Thanks!",
            artifactUrl: "https://example.com/a/123",
            isReply: true,
          },
        ],
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe("Jane replied on My Artifact");
    });

    it("generates subject for multiple comments", () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "My Artifact",
        events: [
          {
            authorName: "John",
            commentPreview: "Comment 1",
            artifactUrl: "https://example.com/a/123",
            isReply: false,
          },
          {
            authorName: "Jane",
            commentPreview: "Comment 2",
            artifactUrl: "https://example.com/a/123",
            isReply: false,
          },
          {
            authorName: "Bob",
            commentPreview: "Comment 3",
            artifactUrl: "https://example.com/a/123",
            isReply: false,
          },
        ],
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe("3 comments on My Artifact");
    });

    it("generates subject for multiple replies", () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "My Artifact",
        events: [
          {
            authorName: "John",
            commentPreview: "Reply 1",
            artifactUrl: "https://example.com/a/123",
            isReply: true,
          },
          {
            authorName: "Jane",
            commentPreview: "Reply 2",
            artifactUrl: "https://example.com/a/123",
            isReply: true,
          },
        ],
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe("2 replies on My Artifact");
    });

    it("generates subject for mixed comments and replies", () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "My Artifact",
        events: [
          {
            authorName: "John",
            commentPreview: "Comment",
            artifactUrl: "https://example.com/a/123",
            isReply: false,
          },
          {
            authorName: "Jane",
            commentPreview: "Reply 1",
            artifactUrl: "https://example.com/a/123",
            isReply: true,
          },
          {
            authorName: "Bob",
            commentPreview: "Reply 2",
            artifactUrl: "https://example.com/a/123",
            isReply: true,
          },
        ],
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe("1 comment and 2 replies on My Artifact");
    });

    it("handles singular reply correctly", () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "Test",
        events: [
          {
            authorName: "A",
            commentPreview: "c1",
            artifactUrl: "url",
            isReply: false,
          },
          {
            authorName: "B",
            commentPreview: "r1",
            artifactUrl: "url",
            isReply: true,
          },
        ],
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe("1 comment and 1 reply on Test");
    });
  });

  describe("invitation templates", () => {
    it("generates subject for invitation", () => {
      const template: EmailTemplate = {
        type: "invitation",
        inviterName: "Alice",
        artifactTitle: "Project Design Doc",
        artifactUrl: "https://example.com/a/456",
        recipientEmail: "bob@example.com",
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe('You\'ve been invited to review "Project Design Doc"');
    });
  });

  describe("magic-link templates", () => {
    it("generates subject for magic link", () => {
      const template: EmailTemplate = {
        type: "magic-link",
        url: "https://example.com/auth?token=abc123",
      };

      const subject = generateEmailSubject(template);
      expect(subject).toBe("Sign in to Artifact Review");
    });
  });
});

describe("renderEmailTemplate", () => {
  describe("comment-digest templates", () => {
    it("renders single comment email with correct structure", async () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "My Artifact",
        recipientName: "Alice",
        events: [
          {
            authorName: "John",
            commentPreview: "Great work on this design!",
            artifactUrl: "https://example.com/a/123",
            isReply: false,
          },
        ],
      };

      const html = await renderEmailTemplate(template);

      // Check for key content
      expect(html).toContain("New Comment");
      expect(html).toContain("Hi Alice,");
      expect(html).toContain("My Artifact");
      expect(html).toContain("John");
      expect(html).toContain("Great work on this design!");
      expect(html).toContain("https://example.com/a/123");
      expect(html).toContain("View Artifact");
    });

    it("renders multiple events in digest", async () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "Design Doc",
        events: [
          {
            authorName: "John",
            commentPreview: "Comment 1",
            artifactUrl: "https://example.com/a/123",
            isReply: false,
          },
          {
            authorName: "Jane",
            commentPreview: "Reply to comment",
            artifactUrl: "https://example.com/a/123",
            isReply: true,
          },
        ],
      };

      const html = await renderEmailTemplate(template);

      expect(html).toContain("2 New Updates");
      expect(html).toContain("John");
      expect(html).toContain("commented");
      expect(html).toContain("Jane");
      expect(html).toContain("replied");
    });

    it("renders without recipient name", async () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "Test",
        events: [
          {
            authorName: "Bob",
            commentPreview: "Test comment",
            artifactUrl: "https://example.com",
            isReply: false,
          },
        ],
      };

      const html = await renderEmailTemplate(template);

      // Should still render with generic greeting
      expect(html).toContain("Hi,");
      expect(html).not.toContain("Hi undefined");
    });
  });

  describe("invitation templates", () => {
    it("renders invitation email with correct structure", async () => {
      const template: EmailTemplate = {
        type: "invitation",
        inviterName: "Alice",
        artifactTitle: "Project Proposal",
        artifactUrl: "https://example.com/a/456",
        recipientEmail: "bob@example.com",
      };

      const html = await renderEmailTemplate(template);

      expect(html).toContain("invited to review");
      expect(html).toContain("Alice");
      expect(html).toContain("Project Proposal");
      expect(html).toContain("https://example.com/a/456");
      expect(html).toContain("View Artifact");
      expect(html).toContain("Can Comment");
    });

    it("renders custom permission level", async () => {
      const template: EmailTemplate = {
        type: "invitation",
        inviterName: "Alice",
        artifactTitle: "Test",
        artifactUrl: "https://example.com",
        recipientEmail: "bob@example.com",
        permission: "Can Edit",
      };

      const html = await renderEmailTemplate(template);

      expect(html).toContain("Can Edit");
    });
  });

  describe("magic-link templates", () => {
    it("renders magic link email with correct structure", async () => {
      const template: EmailTemplate = {
        type: "magic-link",
        url: "https://example.com/auth?token=abc123",
      };

      const html = await renderEmailTemplate(template);

      expect(html).toContain("Sign in to Artifact Review");
      expect(html).toContain("https://example.com/auth?token=abc123");
      // React Email renders numbers separately, so check for both parts
      expect(html).toMatch(/10.*minutes/s); // Default expiry
    });

    it("renders custom expiry time", async () => {
      const template: EmailTemplate = {
        type: "magic-link",
        url: "https://example.com/auth?token=xyz",
        expiresInMinutes: 30,
      };

      const html = await renderEmailTemplate(template);

      expect(html).toMatch(/30.*minutes/s);
    });
  });

  describe("common elements", () => {
    it("includes footer in all templates", async () => {
      const templates: EmailTemplate[] = [
        {
          type: "comment-digest",
          artifactTitle: "Test",
          events: [
            {
              authorName: "X",
              commentPreview: "Y",
              artifactUrl: "Z",
            },
          ],
        },
        {
          type: "invitation",
          inviterName: "A",
          artifactTitle: "B",
          artifactUrl: "C",
          recipientEmail: "D",
        },
        {
          type: "magic-link",
          url: "E",
        },
      ];

      for (const template of templates) {
        const html = await renderEmailTemplate(template);
        expect(html).toContain("Artifact Review");
      }
    });

    it("renders valid HTML", async () => {
      const template: EmailTemplate = {
        type: "comment-digest",
        artifactTitle: "Test",
        events: [
          {
            authorName: "User",
            commentPreview: "Comment",
            artifactUrl: "https://example.com",
          },
        ],
      };

      const html = await renderEmailTemplate(template);

      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });
  });
});
