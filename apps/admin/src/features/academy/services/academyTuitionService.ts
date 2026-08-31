import { supabase } from '@/lib/supabaseClient';
import type { TuitionPeriod, TuitionPeriodInput } from '../types/TuitionPeriod';
import type { AcademyPayment, PaymentInput, OverduePayment } from '../types/AcademyPayment';

const TUITION_PERIOD_SELECT = `
  id, business_id, group_id, day_of_month, amount_cents, active,
  created_at, updated_at
`;

const PAYMENT_SELECT = `
  id, business_id, enrollment_id, period_start, period_end, status,
  amount_cents, paid_at, payment_method, reference,
  created_at, updated_at
`;

type TuitionPeriodRow = {
  id: string;
  business_id: string;
  group_id: string;
  day_of_month: number | null;
  amount_cents: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  business_id: string;
  enrollment_id: string;
  period_start: string;
  period_end: string;
  status: string;
  amount_cents: number;
  paid_at: string | null;
  payment_method: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentWithEnrollmentRow = PaymentRow & {
  enrollment: {
    id: string;
    dependent_id: string;
    group_id: string;
    dependent: {
      full_name: string;
      guardian_name: string | null;
      guardian_phone: string | null;
    };
    group: {
      name: string;
    };
  };
};

function toTuitionPeriod(row: TuitionPeriodRow): TuitionPeriod {
  return {
    id: row.id,
    businessId: row.business_id,
    groupId: row.group_id,
    dayOfMonth: row.day_of_month,
    amountCents: row.amount_cents,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPayment(row: PaymentRow): AcademyPayment {
  return {
    id: row.id,
    businessId: row.business_id,
    enrollmentId: row.enrollment_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status as 'PAGADO' | 'NO_PAGADO',
    amountCents: row.amount_cents,
    paidAt: row.paid_at,
    paymentMethod: row.payment_method as 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO' | null,
    reference: row.reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTuitionPeriodsByGroup(groupId: string): Promise<TuitionPeriod[]> {
  const { data, error } = await supabase
    .from('academy_tuition_periods')
    .select(TUITION_PERIOD_SELECT)
    .eq('group_id', groupId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as TuitionPeriodRow[] ?? []).map(toTuitionPeriod);
}

export async function upsertTuitionPeriod(input: TuitionPeriodInput): Promise<TuitionPeriod> {
  const { data: businessId, error: bizError } = await supabase.rpc('current_user_business_id');
  if (bizError || !businessId) throw new Error('No se pudo obtener business_id');
  const payload = {
    business_id: businessId,
    group_id: input.groupId,
    day_of_month: input.dayOfMonth,
    amount_cents: input.amountCents,
    active: input.active ?? true,
  };
  const { data, error } = await supabase
    .from('academy_tuition_periods')
    .upsert(payload, { onConflict: 'group_id' })
    .select(TUITION_PERIOD_SELECT)
    .single();
  if (error) throw error;
  return toTuitionPeriod(data as TuitionPeriodRow);
}

export async function listPaymentsByEnrollment(enrollmentId: string): Promise<AcademyPayment[]> {
  const { data, error } = await supabase
    .from('academy_payments')
    .select(PAYMENT_SELECT)
    .eq('enrollment_id', enrollmentId)
    .order('period_start', { ascending: false });
  if (error) throw error;
  return (data as PaymentRow[] ?? []).map(toPayment);
}

export async function upsertPayment(enrollmentId: string, input: PaymentInput): Promise<AcademyPayment> {
  const { data: businessId, error: bizError } = await supabase.rpc('current_user_business_id');
  if (bizError || !businessId) throw new Error('No se pudo obtener business_id');
  const payload = {
    business_id: businessId,
    enrollment_id: enrollmentId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    status: input.status,
    amount_cents: input.amountCents,
    paid_at: input.paidAt ?? null,
    payment_method: input.paymentMethod ?? null,
    reference: input.reference ?? null,
  };
  const { data, error } = await supabase
    .from('academy_payments')
    .upsert(payload, { onConflict: 'enrollment_id,period_start' })
    .select(PAYMENT_SELECT)
    .single();
  if (error) throw error;
  return toPayment(data as PaymentRow);
}

export async function getOverduePayments(businessId: string, groupId?: string): Promise<OverduePayment[]> {
  const today = new Date().toISOString().split('T')[0] as string;
  let query = supabase
    .from('academy_payments')
    .select(`
      ${PAYMENT_SELECT},
      enrollment:academy_enrollments!inner(
        id, dependent_id, group_id,
        dependent:dependents!inner(full_name, guardian_name, guardian_phone),
        group:academy_groups!inner(name)
      )
    `)
    .eq('business_id', businessId)
    .eq('status', 'NO_PAGADO')
    .lt('period_end', today)
    .order('period_end', { ascending: true });
  if (groupId) {
    query = query.eq('enrollment.group_id', groupId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as PaymentWithEnrollmentRow[] ?? []).map((row) => {
    const payment = toPayment(row);
    const periodEnd = new Date(row.period_end);
    const todayDate = new Date(today);
    const daysOverdue = Math.floor((todayDate.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...payment,
      enrollment: {
        id: row.enrollment.id,
        dependentId: row.enrollment.dependent_id,
        groupId: row.enrollment.group_id,
        dependent: {
          fullName: row.enrollment.dependent.full_name,
          guardianName: row.enrollment.dependent.guardian_name,
          guardianPhone: row.enrollment.dependent.guardian_phone,
        },
        group: {
          name: row.enrollment.group.name,
        },
      },
      daysOverdue,
    } as OverduePayment;
  });
}