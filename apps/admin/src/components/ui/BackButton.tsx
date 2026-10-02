import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// navigate(-1) usa el historial real del navegador (no una ruta fija),
// para que "Ballet A" -> detalle -> regresar te devuelva a la lista de
// Ballet A tal como estaba, no siempre al Home del panel.
export function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      id="back-button"
      type="button"
      onClick={() => navigate(-1)}
      className="-ms-2 mb-4 inline-flex min-h-10 items-center gap-0.5 rounded-control ps-1 pe-3 text-pequeno font-medium text-texto-suave transition-colors duration-200 hover:bg-suave hover:text-texto active:bg-suave"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      Regresar
    </button>
  );
}
