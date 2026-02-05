import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

export interface MagicLinkEmailProps {
  url: string;
  expiresInMinutes?: number;
}

export function MagicLinkEmail({
  url,
  expiresInMinutes = 10,
}: MagicLinkEmailProps) {
  const preview = "Sign in to Artifact Review";

  return (
    <EmailLayout preview={preview}>
      <Heading style={heading}>Sign in to Artifact Review</Heading>

      <Text style={paragraph}>
        Click the button below to sign in to your account. This link will expire
        in {expiresInMinutes} minutes.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={url}>
          Sign in to Artifact Review
        </Button>
      </Section>

      <Text style={disclaimer}>
        If you didn't request this email, you can safely ignore it.
      </Text>

      <Text style={fallbackLink}>
        This link expires in {expiresInMinutes} minutes. If the button doesn't
        work, copy and paste this URL into your browser:
        <br />
        <a href={url} style={{ color: "#6b7280", wordBreak: "break-all" as const }}>
          {url}
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

export default MagicLinkEmail;
