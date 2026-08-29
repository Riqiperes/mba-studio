import { supabase } from "@/lib/supabaseClient";
import type { ClassFilters, StudioClass } from "../types/StudioClass";

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

export async function listClasses(filters: ClassFilters = {}): Promise<StudioClass[]> {
  let query = supabase.from("studio_classes").select(SELECT_COLUMNS);

  if (filters.instructorId) query = query.eq("instructor_id", filters.instructorId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.dateFrom) query = query.gte("starts_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("starts_at", filters.dateTo);

  const { data, error } = await query.order("starts_at", { ascending: true });

  if (error) throw error;
  return data.map(toStudioClass);
}

export async function createClass(
  businessId: string,
  input: { instructorId: string; title: string; startsAt: string; endsAt: string; maxCapacity: number },
): Promise<StudioClass> {
  const { data, error } = await supabase
    .from("studio_classes")
    .insert({
      business_id: businessId,
      instructor_id: input.instructorId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      max_capacity: input.maxCapacity,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toStudioClass(data);
}

export async function updateClass(
  id: string,
  input: {
    instructorId?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    maxCapacity?: number;
  },
): Promise<StudioClass> {
  const updateData: { instructor_id?: string; title?: string; starts_at?: string; ends_at?: string; max_capacity?: number } = {};

  if (input.instructorId !== undefined) updateData.instructor_id = input.instructorId;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.startsAt !== undefined) updateData.starts_at = input.startsAt;
  if (input.endsAt !== undefined) updateData.ends_at = input.endsAt;
  if (input.maxCapacity !== undefined) updateData.max_capacity = input.maxCapacity;

  const { data, error } = await supabase
    .from("studio_classes")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toStudioClass(data);
}

export async function cancelClass(id: string): Promise<void> {
  const { error } = await supabase
    .from("studio_classes")
    .update({ status: "CANCELLED" })
    .eq("id", id);

  if (error) throw error;
}
