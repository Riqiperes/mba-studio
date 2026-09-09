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
 * Cuota de inscripcion DUMMY: marca registration_fee_paid=true sin pasar
 * por Stripe. Reemplazar cuando la etapa 14 (Stripe) conecte un cobro
 * real -- ver docs/superpowers/specs/2026-09-09-academy-self-enrollment-and-admin-visibility-design.md.
 */
export async function createEnrollmentRequest(
  businessId: string,
  dependentId: string,
  groupId: string,
): Promise<void> {
  const { error } = await supabase.from("academy_enrollments").insert({
    business_id: businessId,
    dependent_id: dependentId,
    group_id: groupId,
    status: "PENDIENTE",
    registration_fee_paid: true,
    registration_fee_paid_at: new Date().toISOString(),
  });

  if (error) throw error;
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
