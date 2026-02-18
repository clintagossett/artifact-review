import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Terms of Service | Artifact Review",
};

export default function TermsPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "docs", "legal", "terms-of-service.md"),
    "utf-8"
  );

  return <LegalContent content={content} />;
}
