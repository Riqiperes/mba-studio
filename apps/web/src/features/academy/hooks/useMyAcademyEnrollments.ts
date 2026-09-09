import { useCallback, useEffect, useState } from "react";
import { listMyAcademyEnrollments } from "../services/academyEnrollmentService";
import type { MyAcademyEnrollment } from "../types/MyAcademyEnrollment";

export function useMyAcademyEnrollments() {
  const [enrollments, setEnrollments] = useState<MyAcademyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEnrollments(await listMyAcademyEnrollments());
    } catch (err) {
      setError("No se pudieron cargar tus inscripciones de Academia.");
      console.error("[academy] listMyAcademyEnrollments fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { enrollments, loading, error, reload };
}
