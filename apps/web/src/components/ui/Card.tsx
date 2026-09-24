import type { HTMLAttributes, Ref } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

// Radio exterior 20px (rounded-card) con padding 20-24px: los elementos
// internos redondeados usan rounded-control (12px) o menos.
export function Card({ className = "", children, ref, ...rest }: CardProps) {
  return (
    <div ref={ref} className={`rounded-card bg-surface shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ref, ...rest }: CardProps) {
  return (
    <div ref={ref} className={`border-b border-gray-100 px-5 py-4 sm:px-6 ${className}`} {...rest}>
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
