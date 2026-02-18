import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "DMCA Policy | Artifact Review",
};

export default function DmcaPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "docs", "legal", "dmca-policy.md"),
    "utf-8"
  );

  return <LegalContent content={content} />;
}
