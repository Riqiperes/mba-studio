import type { ButtonHTMLAttributes, Ref } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

// Solo "primary" lleva el color de acento: una accion principal por pantalla.
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-hover",
  secondary: "bg-surface-brand text-ink hover:bg-gray-200",
  outline: "border border-line bg-surface text-ink hover:border-gray-400 hover:bg-gray-50",
  ghost: "text-ink-muted hover:bg-gray-100 hover:text-ink",
};

// Alturas minimas de 40/44/52px para que el area tactil sea comoda.
const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-[0.9375rem]",
  lg: "min-h-13 px-7 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ref,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-center font-medium transition-[background-color,border-color,color,scale] duration-150 ease-(--ease-brand) active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {loading && <LoadingSpinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
