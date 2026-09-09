import { supabase } from "@/lib/supabaseClient";
import type { AcademyEnrollment, AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

const ENROLLMENT_COLUMNS =
  "id, business_id, dependent_id, group_id, enrollment_date, status, schedule_id, trial_date, registration_fee_paid, created_at, updated_at";

type EnrollmentRow = {
  id: string;
  business_id: string;
  dependent_id: string;
  group_id: string;
  enrollment_date: string;
  status: AcademyEnrollment["status"];
  schedule_id: string | null;
  trial_date: string | null;
  registration_fee_paid: boolean;
  created_at: string;
  updated_at: string;
};

function toEnrollment(row: EnrollmentRow): AcademyEnrollment {
  return {
    id: row.id,
    businessId: row.business_id,
    dependentId: row.dependent_id,
    groupId: row.group_id,
    enrollmentDate: row.enrollment_date,
    status: row.status,
    scheduleId: row.schedule_id,
    trialDate: row.trial_date,
    registrationFeePaid: row.registration_fee_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function toScheduleLabel(
  schedule: { day_of_week: number; start_time: string; end_time: string } | null,
): string | null {
  if (!schedule) return null;
  return `${DAY_ABBREVIATIONS[schedule.day_of_week]} ${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`;
}

type EnrollmentWithStudentRow = EnrollmentRow & {
  dependents: {
    full_name: string;
    guardian_name: string | null;
    profiles: { full_name: string | null; discount_percent: number } | null;
  } | null;
  academy_group_schedules: { day_of_week: number; start_time: string; end_time: string } | null;
};

function toEnrollmentWithStudent(row: EnrollmentWithStudentRow): AcademyEnrollmentWithStudent {
  return {
    ...toEnrollment(row),
    studentName: row.dependents?.full_name ?? "-",
    guardianName: row.dependents?.guardian_name ?? row.dependents?.profiles?.full_name ?? null,
    guardianDiscountPercent: row.dependents?.profiles?.discount_percent ?? 0,
    scheduleLabel: toScheduleLabel(row.academy_group_schedules),
  };
}

const WITH_STUDENT_SELECT = `${ENROLLMENT_COLUMNS}, dependents(full_name, guardian_name, profiles(full_name, discount_percent)), academy_group_schedules(day_of_week, start_time, end_time)`;

export async function listEnrollmentsByGroup(groupId: string): Promise<AcademyEnrollmentWithStudent[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(WITH_STUDENT_SELECT)
    .eq("group_id", groupId)
    .eq("status", "ACTIVA")
    .order("enrollment_date", { ascending: true });

  if (error) throw error;
  return (data as EnrollmentWithStudentRow[]).map(toEnrollmentWithStudent);
}

export async function listPendingRequestsByGroup(groupId: string): Promise<AcademyEnrollmentWithStudent[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(WITH_STUDENT_SELECT)
    .eq("group_id", groupId)
    .in("status", ["PENDIENTE", "MUESTRA"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as EnrollmentWithStudentRow[]).map(toEnrollmentWithStudent);
}

export async function enrollStudent(
  businessId: string,
  dependentId: string,
  groupId: string,
  enrollmentDate: string,
): Promise<AcademyEnrollment> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .insert({
      business_id: businessId,
      dependent_id: dependentId,
      group_id: groupId,
      enrollment_date: enrollmentDate,
    })
    .select(ENROLLMENT_COLUMNS)
    .single();

  if (error) throw error;
  return toEnrollment(data as EnrollmentRow);
}

export async function approveEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("academy_enrollments")
    .update({ status: "ACTIVA", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function withdrawEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("academy_enrollments")
    .update({ status: "BAJA", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function countPendingAcademyRequests(): Promise<number> {
  const { count, error } = await supabase
    .from("academy_enrollments")
    .select("id", { count: "exact", head: true })
    .in("status", ["PENDIENTE", "MUESTRA"]);

  if (error) throw error;
  return count ?? 0;
}
