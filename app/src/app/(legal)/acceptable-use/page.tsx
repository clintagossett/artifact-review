import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | Artifact Review",
};

export default function AcceptableUsePage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "docs", "legal", "acceptable-use-policy.md"),
    "utf-8"
  );

  return <LegalContent content={content} />;
}
