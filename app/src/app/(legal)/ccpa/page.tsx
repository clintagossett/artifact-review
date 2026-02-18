import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "CCPA Notice | Artifact Review",
};

export default function CcpaPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "docs", "legal", "ccpa-notice.md"),
    "utf-8"
  );

  return <LegalContent content={content} />;
}
