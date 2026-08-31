import { supabase } from "@/lib/supabaseClient";
import type { AcademyEnrollment, AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

const ENROLLMENT_COLUMNS =
  "id, business_id, dependent_id, group_id, enrollment_date, status, created_at, updated_at";

type EnrollmentRow = {
  id: string;
  business_id: string;
  dependent_id: string;
  group_id: string;
  enrollment_date: string;
  status: AcademyEnrollment["status"];
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type EnrollmentWithStudentRow = EnrollmentRow & {
  dependents: { full_name: string; profiles: { full_name: string | null } | null } | null;
};

export async function listEnrollmentsByGroup(groupId: string): Promise<AcademyEnrollmentWithStudent[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(`${ENROLLMENT_COLUMNS}, dependents(full_name, profiles(full_name))`)
    .eq("group_id", groupId)
    .eq("status", "ACTIVA")
    .order("enrollment_date", { ascending: true });

  if (error) throw error;
  return (data as EnrollmentWithStudentRow[]).map((row) => ({
    ...toEnrollment(row),
    studentName: row.dependents?.full_name ?? "-",
    guardianName: row.dependents?.profiles?.full_name ?? null,
  }));
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

export async function withdrawEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("academy_enrollments")
    .update({ status: "BAJA", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
