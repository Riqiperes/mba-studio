import { useCallback, useEffect, useState } from "react";
import {
  createDependent,
  listDependentsByGuardian,
  setDependentActive,
  updateDependent,
} from "../services/dependentsService";
import type { Dependent } from "../types/Dependent";

type DependentInput = { fullName: string; birthDate?: string | null };

export function useDependentsByGuardian(guardianId: string, businessId: string) {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDependents(await listDependentsByGuardian(guardianId));
    } catch (err) {
      setError("No se pudieron cargar los alumnos.");
      console.error("[dependents] listDependentsByGuardian fallo", err);
    } finally {
      setLoading(false);
    }
  }, [guardianId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: DependentInput) {
    await createDependent(businessId, guardianId, input);
    await reload();
  }

  async function update(id: string, input: DependentInput) {
    await updateDependent(id, input);
    await reload();
  }

  async function setActive(id: string, active: boolean) {
    await setDependentActive(id, active);
    await reload();
  }

  return { dependents, loading, error, reload, create, update, setActive };
}
