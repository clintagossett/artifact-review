import Link from "next/link";
import { MessageSquare } from "lucide-react";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/cookies", label: "Cookies" },
  { href: "/dmca", label: "DMCA" },
  { href: "/ccpa", label: "CCPA" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">
              Artifact Review
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        {children}
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <nav className="flex flex-wrap gap-4 justify-center text-sm text-gray-500">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-gray-900 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-center text-sm text-gray-400 mt-4">
            &copy; {new Date().getFullYear()} Artifact Review. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
