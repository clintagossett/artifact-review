import {
  Button,
  Heading,
  Section,
  Text,
  Link,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

export interface CommentEvent {
  authorName: string;
  commentPreview: string;
  artifactUrl: string;
  isReply?: boolean;
}

export interface CommentDigestEmailProps {
  recipientName?: string;
  artifactTitle: string;
  events: CommentEvent[];
}

export function CommentDigestEmail({
  recipientName,
  artifactTitle,
  events,
}: CommentDigestEmailProps) {
  const isSingle = events.length === 1;
  const replyCount = events.filter((e) => e.isReply).length;
  const commentCount = events.length - replyCount;

  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const preview = isSingle
    ? `${events[0].authorName} ${events[0].isReply ? "replied" : "commented"} on ${artifactTitle}`
    : `${events.length} new updates on ${artifactTitle}`;

  return (
    <EmailLayout preview={preview}>
      <Heading style={heading}>
        {isSingle
          ? events[0].isReply
            ? "New Reply"
            : "New Comment"
          : `${events.length} New Updates`}
      </Heading>

      <Text style={greetingStyle}>{greeting}</Text>

      <Text style={paragraph}>
        <strong>{artifactTitle}</strong> has new activity.
      </Text>

      {events.map((event, index) => (
        <Section key={index} style={eventContainer}>
          <Text style={eventHeader}>
            <strong>{event.authorName}</strong>
            {event.isReply ? " replied" : " commented"}:
          </Text>
          <Text style={eventContent}>{event.commentPreview}</Text>
          <Link href={event.artifactUrl} style={eventLink}>
            View
          </Link>
        </Section>
      ))}

      <Section style={buttonContainer}>
        <Button style={button} href={events[0].artifactUrl}>
          View Artifact
        </Button>
      </Section>

      {!isSingle && (
        <Text style={summary}>
          {commentCount > 0 &&
            `${commentCount} comment${commentCount > 1 ? "s" : ""}`}
          {commentCount > 0 && replyCount > 0 && " and "}
          {replyCount > 0 &&
            `${replyCount} repl${replyCount > 1 ? "ies" : "y"}`}
        </Text>
      )}
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
};

const greetingStyle: React.CSSProperties = {
  color: "#4b5563",
  fontSize: "16px",
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 24px 0",
};

const eventContainer: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  borderLeft: "3px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  borderRadius: "0 4px 4px 0",
};

const eventHeader: React.CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  margin: "0 0 4px 0",
};

const eventContent: React.CSSProperties = {
  color: "#4b5563",
  fontSize: "14px",
  margin: "4px 0 8px 0",
  lineHeight: "1.4",
};

const eventLink: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
};

const buttonContainer: React.CSSProperties = {
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#000000",
  color: "#ffffff",
  padding: "12px 32px",
  textDecoration: "none",
  borderRadius: "6px",
  fontSize: "16px",
  fontWeight: "500",
};

const summary: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0",
};

export default CommentDigestEmail;
