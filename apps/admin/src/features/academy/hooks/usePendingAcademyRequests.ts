import { useCallback, useEffect, useState } from "react";
import {
  approveEnrollment,
  listPendingRequestsByGroup,
  withdrawEnrollment,
} from "../services/academyEnrollmentsService";
import type { AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

export function usePendingAcademyRequests(groupId: string) {
  const [requests, setRequests] = useState<AcademyEnrollmentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listPendingRequestsByGroup(groupId));
    } catch (err) {
      setError("No se pudieron cargar las solicitudes pendientes.");
      console.error("[academy] listPendingRequestsByGroup fallo", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function approve(id: string) {
    await approveEnrollment(id);
    await reload();
  }

  async function reject(id: string) {
    await withdrawEnrollment(id);
    await reload();
  }

  async function markTrialAttended(id: string) {
    await withdrawEnrollment(id);
    await reload();
  }

  return { requests, loading, error, reload, approve, reject, markTrialAttended };
}
