import { useState } from "react";
import { signInWithGoogle } from "../services/authService";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setError(null);
    setIsLoading(true);
    try {
      // Si tiene exito, el navegador redirige a Google — este componente
      // se desmonta y no hace falta volver isLoading a false.
      await signInWithGoogle();
    } catch (err) {
      setIsLoading(false);
      setError("No se pudo iniciar el login con Google. Intenta de nuevo.");
      console.error("[auth] signInWithGoogle fallo", err);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        id="google-sign-in-button"
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {isLoading ? "Conectando con Google..." : "Continuar con Google"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
