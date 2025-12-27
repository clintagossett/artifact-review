import { MessageSquare } from "lucide-react";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 ${className}`}
    >
      <MessageSquare className="w-6 h-6 text-white" />
    </div>
  );
}
