import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { createMyDependent, listMyDependents } from "../services/dependentsService";
import type { Dependent } from "../types/Dependent";

export function useMyDependents() {
  const { profile } = useAuth();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDependents(await listMyDependents());
    } catch (err) {
      setError("No se pudieron cargar tus alumnos.");
      console.error("[dependents] listMyDependents fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: { fullName: string; birthDate: string | null }): Promise<Dependent> {
    if (!profile?.businessId) throw new Error("Falta el negocio del cliente.");
    const created = await createMyDependent(profile.businessId, input);
    await reload();
    return created;
  }

  return { dependents, loading, error, reload, create };
}
