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
      className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
    >
      ← Regresar
    </button>
  );
}
