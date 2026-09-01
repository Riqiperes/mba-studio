import { useCallback, useEffect, useState, useMemo } from "react";
import { listUpcomingClasses, listInstructors } from "../services/studioClassesService";
import type { StudioClassWithInstructor, ClassFilters } from "../types/StudioClass";

export function useStudioClasses(filters: ClassFilters = {}) {
  const [classes, setClasses] = useState<StudioClassWithInstructor[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize filters to prevent unnecessary reloads
  const memoizedFilters = useMemo(
    () => ({
      instructorId: filters.instructorId ?? "",
      dateFrom: filters.dateFrom ?? "",
      dateTo: filters.dateTo ?? "",
    }),
    [filters.instructorId, filters.dateFrom, filters.dateTo],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classesData, instructorsData] = await Promise.all([
        listUpcomingClasses(memoizedFilters),
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
  }, [memoizedFilters]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { classes, instructors, loading, error, reload };
}