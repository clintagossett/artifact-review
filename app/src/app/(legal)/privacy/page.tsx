import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Privacy Policy | Artifact Review",
};

export default function PrivacyPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "docs", "legal", "privacy-policy.md"),
    "utf-8"
  );

  return <LegalContent content={content} />;
}
