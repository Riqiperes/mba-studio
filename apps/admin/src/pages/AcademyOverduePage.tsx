import { useState, useEffect, useCallback } from 'react';
import { MarkPaymentModal } from '@/features/academy/components/MarkPaymentModal';
import { useAcademyGroups } from '@/features/academy/hooks/useAcademyGroups';
import { getOverduePayments } from '@/features/academy/services/academyTuitionService';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { supabase } from '@/lib/supabaseClient';
import type { OverduePayment } from '@/features/academy/types/AcademyPayment';
import { BackButton } from '@/components/ui/BackButton';
import { ScreenHeader } from "@/components/ui/ScreenHeader";

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
    return (
      <div className="mx-auto max-w-6xl p-6 text-sm text-texto-suave">
        <BackButton />
        Cargando...
      </div>
    );
  }

  return (
    <div id="academy-overdue-page" className="mx-auto max-w-6xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Academia de Ballet"
        title="Colegiaturas atrasadas"
        actions={
        <div className="flex items-center gap-3">
          <label htmlFor="group-filter" className="text-pequeno whitespace-nowrap text-texto-suave">
            Filtrar por grupo:
          </label>
          <select
            id="group-filter"
            value={selectedGroupId ?? ''}
            onChange={(e) => setSelectedGroupId(e.target.value || undefined)}
            className="campo campo-compacto"
          >
            <option value="">Todos los grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        }
      />

      {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}

      {overduePayments.length === 0 ? (
        <p className="rounded-card bg-suave py-8 text-center text-cuerpo text-texto-suave">
          No hay pagos atrasados{selectedGroupId ? ' para este grupo' : ''}.
        </p>
      ) : (
        <div className="tabla-contenedor">
          <table id="academy-overdue-table" className="tabla">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Grupo</th>
                <th>Tutor</th>
                <th>Teléfono</th>
                <th>Periodo</th>
                <th>Monto</th>
                <th>Días de atraso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {overduePayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.enrollment.dependent.fullName}</td>
                  <td>{payment.enrollment.group.name}</td>
                  <td>{payment.enrollment.dependent.guardianName ?? '-'}</td>
                  <td>{payment.enrollment.dependent.guardianPhone ?? '-'}</td>
                  <td>{formatPeriod(payment.periodStart, payment.periodEnd)}</td>
                  <td className="py-2 font-medium">{formatAmount(payment.amountCents)}</td>
                  <td className="py-2 text-alerta font-medium">{payment.daysOverdue}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(payment)}
                      className="accion text-acento"
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

      {selectedPayment && (
        <MarkPaymentModal
          enrollmentId={selectedPayment.enrollmentId}
          onClose={() => setSelectedPayment(null)}
          onSuccess={handlePaymentSuccess}
          basePriceCents={selectedPayment.amountCents}
          discountPercent={selectedPayment.enrollment.dependent.guardianDiscountPercent ?? undefined}
        />
      )}
    </div>
  );
}