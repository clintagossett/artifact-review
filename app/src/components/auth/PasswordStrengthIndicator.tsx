"use client";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthLevel {
  label: string;
  color: string;
  width: string;
  value: number;
}

function calculateStrength(password: string): StrengthLevel {
  if (password.length === 0) {
    return { label: "Too weak", color: "bg-gray-300", width: "0%", value: 0 };
  }

  let strength = 0;

  // Length check
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;

  // Contains number
  if (/\d/.test(password)) strength += 20;

  // Contains lowercase
  if (/[a-z]/.test(password)) strength += 15;

  // Contains uppercase
  if (/[A-Z]/.test(password)) strength += 15;

  // Contains special character
  if (/[^a-zA-Z0-9]/.test(password)) strength += 10;

  // Determine level based on strength score
  if (strength < 30) {
    return { label: "Weak", color: "bg-red-500", width: "25%", value: 25 };
  } else if (strength < 50) {
    return { label: "Fair", color: "bg-yellow-500", width: "50%", value: 50 };
  } else if (strength < 80) {
    return { label: "Good", color: "bg-green-500", width: "75%", value: 75 };
  } else {
    return { label: "Strong", color: "bg-green-600", width: "100%", value: 100 };
  }
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = calculateStrength(password);

  return (
    <div className="space-y-2">
      {/* Strength Label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Password strength:</span>
        <span
          className={`font-medium ${
            strength.value === 0
              ? "text-gray-500"
              : strength.value < 50
              ? "text-red-600"
              : strength.value < 80
              ? "text-yellow-600"
              : "text-green-600"
          }`}
        >
          {strength.label}
        </span>
      </div>

      {/* Strength Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-label={`Password strength: ${strength.label}`}
          aria-valuenow={strength.value}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full ${strength.color} transition-all duration-300 ease-out`}
          style={{ width: strength.width }}
        />
      </div>
    </div>
  );
}
