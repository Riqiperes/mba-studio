import { useCallback, useEffect, useState } from "react";
import { listAllDependents } from "../services/dependentsService";
import type { DependentWithGuardian } from "../types/Dependent";

export function useAllDependents() {
  const [dependents, setDependents] = useState<DependentWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDependents(await listAllDependents());
    } catch (err) {
      setError("No se pudieron cargar los alumnos.");
      console.error("[dependents] listAllDependents fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { dependents, loading, error, reload };
}
