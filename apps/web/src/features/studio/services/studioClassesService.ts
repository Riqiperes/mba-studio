import { supabase } from "@/lib/supabaseClient";
import type { StudioClass, StudioClassWithInstructor, ClassFilters } from "../types/StudioClass";

const SELECT_COLUMNS =
  "id, business_id, instructor_id, title, starts_at, ends_at, max_capacity, status, created_at, updated_at";

type StudioClassRow = {
  id: string;
  business_id: string;
  instructor_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  max_capacity: number;
  status: StudioClass["status"];
  created_at: string;
  updated_at: string;
};

type StudioClassWithInstructorRow = StudioClassRow & {
  instructors: { full_name: string } | null;
};

function toStudioClass(row: StudioClassRow): StudioClass {
  return {
    id: row.id,
    businessId: row.business_id,
    instructorId: row.instructor_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxCapacity: row.max_capacity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Medianoche LOCAL de un dia YYYY-MM-DD como instante ISO. Un string de
// solo fecha Postgres lo lee como medianoche UTC (6 pm del dia anterior en
// Merida), y la semana traia clases de mas o de menos.
function localDayStartIso(dateStr: string, addDays = 0): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + addDays);
  return date.toISOString();
}

export async function listUpcomingClasses(filters: ClassFilters = {}): Promise<StudioClassWithInstructor[]> {
  let query = supabase
    .from("studio_classes")
    .select(`${SELECT_COLUMNS}, instructors(full_name)`)
    .neq("status", "CANCELLED")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (filters.instructorId) query = query.eq("instructor_id", filters.instructorId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.dateFrom) query = query.gte("starts_at", localDayStartIso(filters.dateFrom));
  if (filters.dateTo) query = query.lt("starts_at", localDayStartIso(filters.dateTo, 1));

  const { data, error } = await query;

  if (error) throw error;

  return (data as StudioClassWithInstructorRow[]).map((row) => ({
    ...toStudioClass(row),
    instructorName: row.instructors?.full_name ?? null,
  }));
}

export async function listInstructors(): Promise<{ id: string; fullName: string }[]> {
  const { data, error } = await supabase
    .from("instructors")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name }));
}
/** Reservas CONFIRMED por clase (de todos los clientes), via RPC de la migracion 033. */
export async function getClassBookingCounts(classIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (classIds.length === 0) return counts;
  const { data, error } = await supabase.rpc("class_booking_counts", { class_ids: classIds });
  if (error) throw error;
  for (const row of data) counts.set(row.class_id, row.booked_count);
  return counts;
}
