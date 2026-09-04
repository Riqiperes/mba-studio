import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { cancelClass, createClasses, listClasses, updateClass } from "../services/classesService";
import type { ClassFilters, CreateClassesInput, CreateClassesResult, StudioClass } from "../types/StudioClass";

type UpdateClassInput = {
  instructorId?: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  maxCapacity?: number;
};

export function useClasses(filters: ClassFilters) {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<StudioClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClasses(await listClasses(filters));
    } catch (err) {
      setError("No se pudieron cargar las clases.");
      console.error("[classes] listClasses fallo", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.instructorId, filters.status, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: CreateClassesInput): Promise<CreateClassesResult> {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    const result = await createClasses(profile.businessId, input);
    await reload();
    return result;
  }

  async function update(id: string, input: UpdateClassInput) {
    await updateClass(id, input);
    await reload();
  }

  async function cancel(id: string) {
    await cancelClass(id);
    await reload();
  }

  return { classes, loading, error, reload, create, update, cancel };
}
