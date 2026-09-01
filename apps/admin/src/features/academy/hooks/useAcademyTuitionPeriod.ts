import { useCallback, useEffect, useState } from 'react';
import { listTuitionPeriodsByGroup } from '../services/academyTuitionService';
import type { TuitionPeriod } from '../types/TuitionPeriod';

export function useAcademyTuitionPeriod(groupId: string) {
  const [tuitionPeriod, setTuitionPeriod] = useState<TuitionPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const periods = await listTuitionPeriodsByGroup(groupId);
      setTuitionPeriod(periods[0] ?? null);
    } catch (err) {
      setError('No se pudo cargar la configuración de colegiatura.');
      console.error('[academy] listTuitionPeriodsByGroup fallo', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { tuitionPeriod, loading, error, reload };
}