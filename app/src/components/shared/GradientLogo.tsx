import { LucideIcon } from "lucide-react";

interface GradientLogoProps {
  icon: LucideIcon;
  className?: string;
}

export function GradientLogo({ icon: Icon, className = "" }: GradientLogoProps) {
  return (
    <div
      className={`flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 ${className}`}
    >
      <Icon className="w-10 h-10 text-white" />
    </div>
  );
}
