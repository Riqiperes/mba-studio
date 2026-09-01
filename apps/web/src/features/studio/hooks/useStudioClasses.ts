import { useCallback, useEffect, useState } from "react";
import { listUpcomingClasses, listInstructors } from "../services/studioClassesService";
import type { StudioClassWithInstructor, ClassFilters } from "../types/StudioClass";

export function useStudioClasses(filters: ClassFilters = {}) {
  const [classes, setClasses] = useState<StudioClassWithInstructor[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classesData, instructorsData] = await Promise.all([
        listUpcomingClasses(filters),
        listInstructors(),
      ]);
      setClasses(classesData);
      setInstructors(instructorsData);
    } catch (err) {
      setError("No se pudieron cargar las clases.");
      console.error("[studio] listUpcomingClasses fallo", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { classes, instructors, loading, error, reload };
}