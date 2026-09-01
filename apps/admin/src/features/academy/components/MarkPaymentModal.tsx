import { useState, useEffect, type FormEvent } from 'react';
import { z } from 'zod';
import { getErrorMessage } from '@/utils/getErrorMessage';

interface PeriodOption {
  value: string;
  label: string;
  periodStart: string;
  periodEnd: string;
}

interface Props {
  enrollmentId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialPeriods: PeriodOption[];
}

const paymentSchema = z
  .object({
    period: z.string().min(1, 'Selecciona un periodo'),
    status: z.enum(['PAGADO', 'NO_PAGADO']),
    amountCents: z.coerce.number().int().positive('El monto debe ser mayor a 0').optional(),
    paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'OTRO']).optional(),
    paidAt: z.string().optional(),
    reference: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'PAGADO') {
        return data.amountCents && data.amountCents > 0 && data.paymentMethod && data.paidAt;
      }
      return true;
    },
    {
      message: 'Monto, método y fecha son obligatorios para marcar como PAGADO',
      path: ['status'],
    },
  );

type PaymentFormData = z.infer<typeof paymentSchema>;

function formatPeriodLabel(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  return `${startDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
}

export function MarkPaymentModal({ enrollmentId, onClose, onSuccess, initialPeriods }: Props) {
  const [formData, setFormData] = useState<PaymentFormData>({
    period: initialPeriods[0]?.value ?? '',
    status: 'PAGADO',
    amountCents: undefined,
    paymentMethod: undefined,
    paidAt: new Date().toISOString().slice(0, 10),
    reference: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!formData.period && initialPeriods.length > 0) {
      setFormData((prev) => ({ ...prev, period: initialPeriods[0]!.value }));
    }
  }, [initialPeriods, formData.period]);

  useEffect(() => {
    if (formData.status === 'NO_PAGADO') {
      setFormData((prev) => ({
        ...prev,
        amountCents: undefined,
        paymentMethod: undefined,
        paidAt: undefined,
        reference: '',
      }));
    } else if (!formData.paidAt) {
      setFormData((prev) => ({ ...prev, paidAt: new Date().toISOString().slice(0, 10) }));
    }
  }, [formData.status, formData.paidAt]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleChange(field: keyof PaymentFormData, value: string | number | undefined) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const result = paymentSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      const period = initialPeriods.find((p) => p.value === formData.period);
      if (!period) throw new Error('Periodo no encontrado');

      const { upsertPayment } = await import('../services/academyTuitionService');

      await upsertPayment(enrollmentId, {
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        status: formData.status,
        amountCents: formData.amountCents ?? 0,
        paidAt: formData.status === 'PAGADO' ? formData.paidAt ?? null : null,
        paymentMethod: formData.status === 'PAGADO' ? formData.paymentMethod ?? null : null,
        reference: formData.reference ?? null,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar el pago.'));
      console.error('[academy] marcar pago fallo', err);
    } finally {
      setIsSaving(false);
    }
  }

  const selectedPeriod = initialPeriods.find((p) => p.value === formData.period);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-primary">Marcar pago de colegiatura</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-200">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="period" className="block text-xs text-gray-500 mb-1">
              Periodo *
            </label>
            <select
              id="period"
              value={formData.period}
              onChange={(e) => handleChange('period', e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                fieldErrors.period ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent`}
            >
              <option value="">Selecciona un periodo</option>
              {initialPeriods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {fieldErrors.period && <p className="mt-1 text-xs text-red-600">{fieldErrors.period}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-2">Estado *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="PAGADO"
                  checked={formData.status === 'PAGADO'}
                  onChange={() => handleChange('status', 'PAGADO')}
                  className="h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                />
                <span className="text-sm font-medium">PAGADO</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="NO_PAGADO"
                  checked={formData.status === 'NO_PAGADO'}
                  onChange={() => handleChange('status', 'NO_PAGADO')}
                  className="h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                />
                <span className="text-sm font-medium">NO_PAGADO</span>
              </label>
            </div>
            {fieldErrors.status && <p className="mt-1 text-xs text-red-600">{fieldErrors.status}</p>}
          </div>

          {formData.status === 'PAGADO' && (
            <>
              <div className="mb-4">
                <label htmlFor="amountCents" className="block text-xs text-gray-500 mb-1">
                  Monto (pesos) *
                </label>
                <input
                  id="amountCents"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.amountCents ?? ''}
                  onChange={(e) => handleChange('amountCents', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="Ej: 1500"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    fieldErrors.amountCents ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent`}
                />
                {fieldErrors.amountCents && <p className="mt-1 text-xs text-red-600">{fieldErrors.amountCents}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="paymentMethod" className="block text-xs text-gray-500 mb-1">
                  Método de pago *
                </label>
                <select
                  id="paymentMethod"
                  value={formData.paymentMethod ?? ''}
                  onChange={(e) => handleChange('paymentMethod', e.target.value || undefined)}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    fieldErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent`}
                >
                  <option value="">Selecciona método</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
                {fieldErrors.paymentMethod && <p className="mt-1 text-xs text-red-600">{fieldErrors.paymentMethod}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="paidAt" className="block text-xs text-gray-500 mb-1">
                  Fecha de pago *
                </label>
                <input
                  id="paidAt"
                  type="date"
                  value={formData.paidAt ?? ''}
                  onChange={(e) => handleChange('paidAt', e.target.value || undefined)}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    fieldErrors.paidAt ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent`}
                />
                {fieldErrors.paidAt && <p className="mt-1 text-xs text-red-600">{fieldErrors.paidAt}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="reference" className="block text-xs text-gray-500 mb-1">
                  Referencia / Folio (opcional)
                </label>
                <input
                  id="reference"
                  type="text"
                  value={formData.reference}
                  onChange={(e) => handleChange('reference', e.target.value)}
                  placeholder="Número de operación, folio, etc."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>

        {selectedPeriod && (
          <p className="text-xs text-gray-500 text-center">
            Periodo: {formatPeriodLabel(selectedPeriod.periodStart, selectedPeriod.periodEnd)}
          </p>
        )}
      </div>
    </div>
  );
}