import { Link } from "react-router-dom";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to = "/", label = "Inicio" }: BackButtonProps) {
  return (
    <Link
      id="back-button"
      to={to}
      className="-ms-2 mb-3 inline-flex min-h-10 items-center gap-1 rounded-full ps-1 pe-3 text-sm font-medium text-ink-muted transition-colors duration-150 hover:bg-gray-100 hover:text-ink active:bg-gray-200"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}
