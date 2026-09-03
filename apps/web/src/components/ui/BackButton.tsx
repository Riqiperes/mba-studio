import { Link } from "react-router-dom";

export function BackButton() {
  return (
    <Link
      id="back-button"
      to="/"
      className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
    >
      ← Inicio
    </Link>
  );
}
