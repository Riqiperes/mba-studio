import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "../services/authService";
import { Button } from "@/components/ui/Button";

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
    <Button id="sign-out-button" type="button" variant="outline" size="sm" onClick={handleClick} loading={isLoading}>
      {!isLoading && <LogOut className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />}
      {isLoading ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
