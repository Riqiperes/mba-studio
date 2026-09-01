import { useCallback, useEffect, useState } from 'react';
import { listPaymentsByEnrollment } from '../services/academyTuitionService';
import type { AcademyPayment } from '../types/AcademyPayment';

export function useAcademyPayments(enrollmentId: string) {
  const [payments, setPayments] = useState<AcademyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enrollmentId) return;
    setLoading(true);
    setError(null);
    try {
      setPayments(await listPaymentsByEnrollment(enrollmentId));
    } catch (err) {
      setError('No se pudieron cargar los pagos.');
      console.error('[academy] listPaymentsByEnrollment fallo', err);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { payments, loading, error, reload };
}