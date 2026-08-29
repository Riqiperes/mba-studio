import { useState } from "react";
import { signOut } from "../services/authService";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      await signOut();
    } catch (err) {
      console.error("[auth] signOut fallo", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      id="sign-out-button"
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {isLoading ? "Cerrando sesion..." : "Cerrar sesion"}
    </button>
  );
}
