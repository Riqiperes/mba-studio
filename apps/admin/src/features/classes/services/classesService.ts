import { supabase } from "@/lib/supabaseClient";
import type { ClassFilters, CreateClassesInput, CreateClassesResult, StudioClass } from "../types/StudioClass";

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

// `dateTo` es un YYYY-MM-DD (input local); suma un dia para comparar con
// `starts_at` como limite exclusivo, evitando que Postgres castee a
// medianoche UTC y excluya las clases del propio dia `dateTo`.
function nextDayIso(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

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
  // El input date es una fecha local; la comparacion en la DB es en UTC —
  // aceptable para este MVP de una sola zona horaria (ver comentario en
  // nextDayIso).
  if (filters.dateTo) query = query.lt("starts_at", nextDayIso(filters.dateTo));

  const { data, error } = await query.order("starts_at", { ascending: true });

  if (error) throw error;
  return data.map(toStudioClass);
}

// Suma `days` dias a una fecha YYYY-MM-DD en UTC -- misma tecnica que
// nextDayIso arriba, evita que el timezone del navegador corra la fecha
// al operar sobre un string de solo-fecha.
function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Combina una fecha (YYYY-MM-DD) con una hora local ("HH:mm") en un
// instante ISO -- misma interpretacion de hora local que usa
// ClassFormModal para datetime-local (new Date sin "Z" = hora local).
function combineDateAndTime(dateStr: string, time: string): string {
  return new Date(`${dateStr}T${time}`).toISOString();
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function createClasses(
  businessId: string,
  input: CreateClassesInput,
): Promise<CreateClassesResult> {
  const slots = input.weekdays.flatMap((weekday) =>
    Array.from({ length: input.weeksCount }, (_, week) => {
      const date = addDays(input.weekStart, week * 7 + weekday);
      return {
        date,
        startsAt: combineDateAndTime(date, input.startTime),
        endsAt: combineDateAndTime(date, input.endTime),
      };
    }),
  );

  const lastDate = slots.reduce((max, slot) => (slot.date > max ? slot.date : max), slots[0]?.date ?? input.weekStart);
  const existing = (await listClasses({ dateFrom: input.weekStart, dateTo: lastDate })).filter(
    (studioClass) => studioClass.status !== "CANCELLED",
  );

  const toCreate: { startsAt: string; endsAt: string }[] = [];
  const skipped: { startsAt: string; reason: string }[] = [];

  for (const slot of slots) {
    const conflict = existing.some((studioClass) =>
      rangesOverlap(slot.startsAt, slot.endsAt, studioClass.startsAt, studioClass.endsAt),
    );
    if (conflict) {
      skipped.push({ startsAt: slot.startsAt, reason: "Ya existe una clase en ese horario" });
    } else {
      toCreate.push(slot);
    }
  }

  if (toCreate.length === 0) {
    return { created: [], skipped };
  }

  const { data, error } = await supabase
    .from("studio_classes")
    .insert(
      toCreate.map((slot) => ({
        business_id: businessId,
        instructor_id: input.instructorId,
        title: input.title,
        starts_at: slot.startsAt,
        ends_at: slot.endsAt,
        max_capacity: input.maxCapacity,
      })),
    )
    .select(SELECT_COLUMNS);

  if (error) throw error;
  return { created: data.map(toStudioClass), skipped };
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
