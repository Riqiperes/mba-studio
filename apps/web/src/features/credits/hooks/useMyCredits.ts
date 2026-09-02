// apps/web/src/features/credits/hooks/useMyCredits.ts
import { useCallback, useEffect, useState } from "react";
import { getMyCreditBalance } from "../services/creditsService";

export function useMyCredits() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBalance(await getMyCreditBalance());
    } catch (err) {
      setError("No se pudo cargar tu balance de créditos.");
      console.error("[credits-web] reload fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { balance, loading, error, reload };
}