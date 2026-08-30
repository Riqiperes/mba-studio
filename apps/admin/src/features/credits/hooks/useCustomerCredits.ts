import { useCallback, useEffect, useState } from "react";
import { getCreditBalance, grantCredits } from "../services/creditsService";

export function useCustomerCredits(customerId: string) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBalance(await getCreditBalance(customerId));
    } catch (err) {
      setError("No se pudo cargar el balance de creditos.");
      console.error("[credits] getCreditBalance fallo", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function grant(amount: number, notes?: string | null) {
    await grantCredits(customerId, amount, notes);
    await reload();
  }

  return { balance, loading, error, reload, grant };
}
