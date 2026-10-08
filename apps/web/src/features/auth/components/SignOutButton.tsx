import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "../services/authService";
import { Button } from "@/components/ui/Button";
import { useAppFeedback } from "@/components/ui/AppFeedbackContext";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { notify, confirm } = useAppFeedback();

  async function handleClick() {
    if (!(await confirm({ title: "¿Cerrar sesión?", confirmLabel: "Cerrar sesión" }))) return;
    setIsLoading(true);
    try {
      await signOut();
    } catch (err) {
      notify("No se pudo cerrar la sesión. Intenta de nuevo.", "error");
      console.error("[auth] signOut fallo", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button id="sign-out-button" type="button" variant="outline" size="sm" onClick={handleClick} loading={isLoading}>
      {!isLoading && <LogOut className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />}
      {isLoading ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
