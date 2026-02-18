import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { LegalContent } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Cookie Policy | Artifact Review",
};

export default function CookiesPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "..", "docs", "legal", "cookie-policy.md"),
    "utf-8"
  );

  return <LegalContent content={content} />;
}
