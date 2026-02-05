/**
 * Email Renderer for Next.js (Novu Bridge)
 *
 * Renders React Email templates in the Next.js runtime for the Novu workflow bridge.
 * Mirrors the Convex version but without "use node" directive.
 *
 * Task: 00071-novu-convex-resend-email-architecture
 */

import { render } from "@react-email/render";
import * as React from "react";
import {
  CommentDigestEmail,
  InvitationEmail,
  MagicLinkEmail,
  type CommentEvent,
} from "../../convex/emails";

/**
 * Email template types supported by the renderer
 */
export type EmailTemplate =
  | {
      type: "comment-digest";
      events: CommentEvent[];
      artifactTitle: string;
      recipientName?: string;
    }
  | {
      type: "invitation";
      inviterName: string;
      artifactTitle: string;
      artifactUrl: string;
      recipientEmail: string;
      permission?: string;
    }
  | {
      type: "magic-link";
      url: string;
      expiresInMinutes?: number;
    };

/**
 * Render an email template to HTML string
 */
export async function renderEmailTemplate(
  template: EmailTemplate
): Promise<string> {
  let element: React.ReactElement;

  switch (template.type) {
    case "comment-digest":
      element = React.createElement(CommentDigestEmail, {
        events: template.events,
        artifactTitle: template.artifactTitle,
        recipientName: template.recipientName,
      });
      break;

    case "invitation":
      element = React.createElement(InvitationEmail, {
        inviterName: template.inviterName,
        artifactTitle: template.artifactTitle,
        artifactUrl: template.artifactUrl,
        recipientEmail: template.recipientEmail,
        permission: template.permission,
      });
      break;

    case "magic-link":
      element = React.createElement(MagicLinkEmail, {
        url: template.url,
        expiresInMinutes: template.expiresInMinutes,
      });
      break;

    default:
      throw new Error(`Unknown email template type: ${(template as any).type}`);
  }

  return await render(element);
}

/**
 * Generate email subject based on template type
 */
export function generateEmailSubject(template: EmailTemplate): string {
  switch (template.type) {
    case "comment-digest": {
      const { events, artifactTitle } = template;
      const count = events.length;

      if (count === 1) {
        const event = events[0];
        return event.isReply
          ? `${event.authorName} replied on ${artifactTitle}`
          : `New comment from ${event.authorName} on ${artifactTitle}`;
      }

      const replyCount = events.filter((e) => e.isReply).length;
      const commentCount = count - replyCount;

      const parts: string[] = [];
      if (commentCount > 0) {
        parts.push(`${commentCount} comment${commentCount > 1 ? "s" : ""}`);
      }
      if (replyCount > 0) {
        parts.push(`${replyCount} repl${replyCount > 1 ? "ies" : "y"}`);
      }
      return `${parts.join(" and ")} on ${artifactTitle}`;
    }

    case "invitation":
      return `You've been invited to review "${template.artifactTitle}"`;

    case "magic-link":
      return "Sign in to Artifact Review";

    default:
      throw new Error(`Unknown email template type: ${(template as any).type}`);
  }
}

// Re-export CommentEvent type for use in workflows
export type { CommentEvent };
