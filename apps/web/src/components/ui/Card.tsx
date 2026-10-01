import type { HTMLAttributes, Ref } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

// Tarjeta de PROMPT.md: fondo tarjeta, borde, radio 22, sombra. Los
// elementos internos redondeados usan rounded-control (14px) o rounded-chip.
export function Card({ className = "", children, ref, ...rest }: CardProps) {
  return (
    <div ref={ref} className={`rounded-card border border-borde bg-tarjeta shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ref, ...rest }: CardProps) {
  return (
    <div ref={ref} className={`border-b border-borde px-5 py-4 sm:px-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ref, ...rest }: CardProps) {
  return (
    <div ref={ref} className={`p-5 sm:p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}
