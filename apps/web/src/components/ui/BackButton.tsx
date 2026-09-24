import { ChevronLeft } from "lucide-react";
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
      className="-ms-2 mb-4 inline-flex min-h-10 items-center gap-0.5 rounded-control ps-1 pe-3 text-pequeno font-medium text-texto-suave transition-colors duration-200 hover:bg-suave hover:text-texto active:bg-suave"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      {label}
    </Link>
  );
}
