import { useCallback, useEffect, useState } from "react";
import {
  enrollStudent,
  listEnrollmentsByGroup,
  withdrawEnrollment,
} from "../services/academyEnrollmentsService";
import type { AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

export function useAcademyGroupEnrollments(groupId: string, businessId: string) {
  const [enrollments, setEnrollments] = useState<AcademyEnrollmentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEnrollments(await listEnrollmentsByGroup(groupId));
    } catch (err) {
      setError("No se pudieron cargar los alumnos inscritos.");
      console.error("[academy] listEnrollmentsByGroup fallo", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function enroll(dependentId: string, enrollmentDate: string) {
    if (!businessId) throw new Error("Falta el business_id del grupo.");
    await enrollStudent(businessId, dependentId, groupId, enrollmentDate);
    await reload();
  }

  async function withdraw(id: string) {
    await withdrawEnrollment(id);
    await reload();
  }

  return { enrollments, loading, error, reload, enroll, withdraw };
}
