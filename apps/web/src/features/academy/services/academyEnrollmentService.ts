import { supabase } from "@/lib/supabaseClient";
import type { MyAcademyEnrollment, MyAcademyEnrollmentStatus } from "../types/MyAcademyEnrollment";

const ENROLLMENT_COLUMNS = "id, dependent_id, group_id, status, enrollment_date, trial_date, created_at";

type EnrollmentRow = {
  id: string;
  dependent_id: string;
  group_id: string;
  status: MyAcademyEnrollmentStatus;
  enrollment_date: string;
  trial_date: string | null;
  created_at: string;
  dependents: { full_name: string } | null;
  academy_groups: { name: string } | null;
};

export async function listMyAcademyEnrollments(): Promise<MyAcademyEnrollment[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(`${ENROLLMENT_COLUMNS}, dependents(full_name), academy_groups(name)`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as EnrollmentRow[]).map((row) => ({
    id: row.id,
    dependentId: row.dependent_id,
    studentName: row.dependents?.full_name ?? "-",
    groupId: row.group_id,
    groupName: row.academy_groups?.name ?? "-",
    status: row.status,
    enrollmentDate: row.enrollment_date,
    trialDate: row.trial_date,
    createdAt: row.created_at,
  }));
}

/**
 * Crea la solicitud de inscripcion en estado PENDIENTE, sin cuota pagada
 * todavia. El cobro real se hace despues via Stripe Checkout
 * (createRegistrationCheckoutSession) -- el pago solo lo confirma
 * stripe-webhook, nunca este insert.
 */
export async function createEnrollmentRequest(
  businessId: string,
  dependentId: string,
  groupId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .insert({
      business_id: businessId,
      dependent_id: dependentId,
      group_id: groupId,
      status: "PENDIENTE",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Pide a la Edge Function stripe-checkout una Checkout Session de Stripe
 * para la cuota de inscripcion de `enrollmentId` y devuelve la URL de
 * redireccion. Ver docs/payments.md.
 */
export async function createRegistrationCheckoutSession(enrollmentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    "stripe-checkout",
    { body: { enrollmentId } },
  );

  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? "No se pudo iniciar el pago");
  return data.url;
}

export async function createTrialClassRequest(
  businessId: string,
  dependentId: string,
  groupId: string,
  scheduleId: string,
  trialDate: string,
): Promise<void> {
  const { error } = await supabase.from("academy_enrollments").insert({
    business_id: businessId,
    dependent_id: dependentId,
    group_id: groupId,
    status: "MUESTRA",
    schedule_id: scheduleId,
    trial_date: trialDate,
  });

  if (error) throw error;
}
