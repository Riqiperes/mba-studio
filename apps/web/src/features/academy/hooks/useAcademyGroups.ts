import { useCallback, useEffect, useState } from "react";
import { listActiveAcademyGroups } from "../services/academyService";
import type { AcademyGroupCatalogItem } from "../types/AcademyGroup";

export function useAcademyGroups() {
  const [groups, setGroups] = useState<AcademyGroupCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await listActiveAcademyGroups());
    } catch (err) {
      setError("No se pudieron cargar los grupos de Academia.");
      console.error("[academy] listActiveAcademyGroups fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { groups, loading, error, reload };
}
