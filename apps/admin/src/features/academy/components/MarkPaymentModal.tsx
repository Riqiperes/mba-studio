import { useState, useEffect, type FormEvent } from 'react';
import { z } from 'zod';
import { getErrorMessage } from '@/utils/getErrorMessage';

interface Props {
  enrollmentId: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Precio base de la colegiatura del grupo (antes de descuento), en centavos. */
  basePriceCents?: number | undefined;
  /** Descuento por referido del tutor (0-100). */
  discountPercent?: number | undefined;
}

const paymentSchema = z
  .object({
    month: z.string().min(1, 'Selecciona un mes'),
    status: z.enum(['PAGADO', 'NO_PAGADO']),
    amountCents: z.coerce.number().positive('El monto debe ser mayor a 0').optional(),
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

// Colegiatura vence el dia 10 de cada mes (business-rules.md, corte
// global fijo). El periodo de un mes elegido en el selector va del 10 al
// ultimo dia de ese mismo mes.
function periodForMonth(yearMonth: string): { periodStart: string; periodEnd: string } {
  const [year, month] = yearMonth.split('-').map(Number) as [number, number];
  const periodStart = `${yearMonth}-10`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return { periodStart, periodEnd };
}

function formatPesos(cents: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);
}

export function MarkPaymentModal({ enrollmentId, onClose, onSuccess, basePriceCents, discountPercent }: Props) {
  const [formData, setFormData] = useState<PaymentFormData>({
    month: new Date().toISOString().slice(0, 7),
    status: 'PAGADO',
    amountCents: undefined,
    paymentMethod: undefined,
    paidAt: new Date().toISOString().slice(0, 10),
    reference: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const discountedCents =
    basePriceCents != null
      ? Math.round(basePriceCents * (1 - (discountPercent ?? 0) / 100))
      : null;

  useEffect(() => {
    if (formData.status === 'PAGADO' && discountedCents != null && formData.amountCents === undefined) {
      setFormData((prev) => ({ ...prev, amountCents: discountedCents / 100 }));
    }
  }, [formData.status, formData.amountCents, discountedCents]);

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
      const { periodStart, periodEnd } = periodForMonth(result.data.month);
      const { upsertPayment } = await import('../services/academyTuitionService');

      // El input de "Monto" esta en pesos (ver label); amount_cents en BD
      // es en centavos -- convertir aqui, no antes.
      await upsertPayment(enrollmentId, {
        periodStart,
        periodEnd,
        status: formData.status,
        amountCents: Math.round((formData.amountCents ?? 0) * 100),
        discountApplied: formData.status === 'PAGADO' ? discountPercent ?? 0 : 0,
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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
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
            <label htmlFor="month" className="block text-xs text-gray-500 mb-1">
              Mes *
            </label>
            <input
              id="month"
              type="month"
              value={formData.month}
              onChange={(e) => handleChange('month', e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                fieldErrors.month ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent`}
            />
            <p className="mt-1 text-xs text-gray-500">Cualquier mes, incluye meses pasados.</p>
            {fieldErrors.month && <p className="mt-1 text-xs text-red-600">{fieldErrors.month}</p>}
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
                  min="0.01"
                  step="0.01"
                  value={formData.amountCents ?? ''}
                  onChange={(e) => handleChange('amountCents', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Ej: 1500"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    fieldErrors.amountCents ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent`}
                />
                {fieldErrors.amountCents && <p className="mt-1 text-xs text-red-600">{fieldErrors.amountCents}</p>}
                {basePriceCents != null && discountedCents != null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Colegiatura base: {formatPesos(basePriceCents)}
                    {(discountPercent ?? 0) > 0 && (
                      <> · Descuento {discountPercent}% → {formatPesos(discountedCents)}</>
                    )}
                  </p>
                )}
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
      </div>
    </div>
  );
}
