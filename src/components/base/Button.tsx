import { Loader2 } from "lucide-react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = ({
  label,
  onClick,
  isLoading = false,
  disabled = false,
  className = "",
  variant = "primary",
  size = "md",
}: ButtonProps) => {
  const baseStyles =
    "rounded-lg font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white",
    secondary:
      "bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] text-white",
    ghost:
      "bg-transparent hover:bg-[var(--card)] text-[var(--muted)] hover:text-white",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
    </button>
  );
};

export default Button;
