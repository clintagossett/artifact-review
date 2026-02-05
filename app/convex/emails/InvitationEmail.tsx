import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

export interface InvitationEmailProps {
  inviterName: string;
  artifactTitle: string;
  artifactUrl: string;
  recipientEmail: string;
  permission?: string;
}

export function InvitationEmail({
  inviterName,
  artifactTitle,
  artifactUrl,
  recipientEmail,
  permission = "Can Comment",
}: InvitationEmailProps) {
  const preview = `${inviterName} invited you to review "${artifactTitle}"`;

  return (
    <EmailLayout preview={preview}>
      <Heading style={heading}>
        You've been invited to review an artifact
      </Heading>

      <Text style={paragraph}>
        <strong>{inviterName}</strong> invited you to review and comment on
        their artifact.
      </Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Artifact</Text>
        <Text style={infoValue}>{artifactTitle}</Text>
      </Section>

      <Section style={infoBox}>
        <Text style={infoLabel}>Your Permission</Text>
        <Text style={infoValue}>
          <strong>{permission}</strong> - You can view and add comments to this
          artifact
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={artifactUrl}>
          View Artifact
        </Button>
      </Section>

      <Text style={disclaimer}>
        If you didn't expect this invitation, you can safely ignore this email.
      </Text>

      <Text style={fallbackLink}>
        If the button doesn't work, copy and paste this URL into your browser:
        <br />
        <a href={artifactUrl} style={{ color: "#6b7280", wordBreak: "break-all" as const }}>
          {artifactUrl}
        </a>
      </Text>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
};

const paragraph: React.CSSProperties = {
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 24px 0",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "16px",
};

const infoLabel: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 8px 0",
};

const infoValue: React.CSSProperties = {
  color: "#111827",
  fontSize: "16px",
  margin: "0",
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

const disclaimer: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 16px 0",
};

const fallbackLink: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0",
};

export default InvitationEmail;
