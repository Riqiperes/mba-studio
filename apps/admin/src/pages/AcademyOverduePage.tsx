import { useState, useEffect, useCallback } from 'react';
import { MarkPaymentModal } from '@/features/academy/components/MarkPaymentModal';
import { useAcademyGroups } from '@/features/academy/hooks/useAcademyGroups';
import { getOverduePayments } from '@/features/academy/services/academyTuitionService';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { supabase } from '@/lib/supabaseClient';
import type { OverduePayment } from '@/features/academy/types/AcademyPayment';

export function AcademyOverduePage() {
  const { groups } = useAcademyGroups();

  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  const [selectedPayment, setSelectedPayment] = useState<OverduePayment | null>(null);

  const loadOverduePayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: businessId, error: bizError } = await supabase.rpc('current_user_business_id');
      if (bizError || !businessId) throw new Error('No se pudo obtener business_id');

      const payments = await getOverduePayments(businessId, selectedGroupId);
      setOverduePayments(payments);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los pagos atrasados.'));
      console.error('[academy] overdue payments fallo', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadOverduePayments();
  }, [selectedGroupId, loadOverduePayments]);

  function handleOpenPaymentModal(payment: OverduePayment) {
    setSelectedPayment(payment);
  }

  async function handlePaymentSuccess() {
    setSelectedPayment(null);
    await loadOverduePayments();
  }

  function formatPeriod(start: string, end: string): string {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    return `${startDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
  }

  function formatAmount(cents: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl p-6 text-sm text-gray-500">Cargando...</div>;
  }

  return (
    <div id="academy-overdue-page" className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Colegiaturas atrasadas</h1>
        <div className="flex items-center gap-4">
          <label htmlFor="group-filter" className="text-sm text-gray-500">
            Filtrar por grupo:
          </label>
          <select
            id="group-filter"
            value={selectedGroupId ?? ''}
            onChange={(e) => setSelectedGroupId(e.target.value || undefined)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          >
            <option value="">Todos los grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {overduePayments.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No hay pagos atrasados{selectedGroupId ? ' para este grupo' : ''}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table id="academy-overdue-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">Alumno</th>
                <th className="py-2">Grupo</th>
                <th className="py-2">Tutor</th>
                <th className="py-2">Teléfono</th>
                <th className="py-2">Periodo</th>
                <th className="py-2">Monto</th>
                <th className="py-2">Días de atraso</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {overduePayments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100">
                  <td className="py-2">{payment.enrollment.dependent.fullName}</td>
                  <td className="py-2">{payment.enrollment.group.name}</td>
                  <td className="py-2">{payment.enrollment.dependent.guardianName ?? '-'}</td>
                  <td className="py-2">{payment.enrollment.dependent.guardianPhone ?? '-'}</td>
                  <td className="py-2">{formatPeriod(payment.periodStart, payment.periodEnd)}</td>
                  <td className="py-2 font-medium">{formatAmount(payment.amountCents)}</td>
                  <td className="py-2 text-red-600 font-medium">{payment.daysOverdue}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(payment)}
                      className="text-brand-primary hover:underline text-sm"
                    >
                      Marcar pagado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MarkPaymentModal
        enrollmentId={selectedPayment?.enrollmentId ?? ''}
        onClose={() => {
          setSelectedPayment(null);
        }}
        onSuccess={handlePaymentSuccess}
        initialPeriods={selectedPayment
          ? [
              {
                value: `${selectedPayment.periodStart}|${selectedPayment.periodEnd}`,
                label: formatPeriod(selectedPayment.periodStart, selectedPayment.periodEnd),
                periodStart: selectedPayment.periodStart,
                periodEnd: selectedPayment.periodEnd,
              },
            ]
          : []}
      />
    </div>
  );
}