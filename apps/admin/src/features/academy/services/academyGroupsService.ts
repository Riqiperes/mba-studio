import { supabase } from "@/lib/supabaseClient";
import type {
  AcademyGroup,
  AcademyGroupSchedule,
  AcademyGroupWithDetails,
  GroupInput,
} from "../types/AcademyGroup";

const GROUP_COLUMNS =
  "id, business_id, name, instructor_id, active, age_min, age_max, max_capacity, created_at, updated_at";
const SCHEDULE_COLUMNS = "id, day_of_week, start_time, end_time";

type GroupRow = {
  id: string;
  business_id: string;
  name: string;
  instructor_id: string | null;
  active: boolean;
  age_min: number | null;
  age_max: number | null;
  max_capacity: number;
  created_at: string;
  updated_at: string;
};

type ScheduleRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function toGroup(row: GroupRow): AcademyGroup {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    instructorId: row.instructor_id,
    active: row.active,
    ageMin: row.age_min,
    ageMax: row.age_max,
    maxCapacity: row.max_capacity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSchedule(row: ScheduleRow): AcademyGroupSchedule {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

type GroupWithDetailsRow = GroupRow & {
  instructors: { full_name: string } | null;
  academy_group_schedules: ScheduleRow[];
};

export async function listGroups(): Promise<AcademyGroupWithDetails[]> {
  const { data, error } = await supabase
    .from("academy_groups")
    .select(`${GROUP_COLUMNS}, instructors(full_name), academy_group_schedules(${SCHEDULE_COLUMNS})`)
    .order("name", { ascending: true });

  if (error) throw error;

  const { data: activeEnrollments, error: enrollmentsError } = await supabase
    .from("academy_enrollments")
    .select("group_id")
    .eq("status", "ACTIVA");

  if (enrollmentsError) throw enrollmentsError;

  const countsByGroup = new Map<string, number>();
  for (const row of activeEnrollments) {
    countsByGroup.set(row.group_id, (countsByGroup.get(row.group_id) ?? 0) + 1);
  }

  return (data as GroupWithDetailsRow[]).map((row) => ({
    ...toGroup(row),
    instructorName: row.instructors?.full_name ?? null,
    schedules: row.academy_group_schedules.map(toSchedule),
    enrolledCount: countsByGroup.get(row.id) ?? 0,
  }));
}

export async function createGroup(businessId: string, input: GroupInput): Promise<AcademyGroup> {
  const { data, error } = await supabase
    .from("academy_groups")
    .insert({
      business_id: businessId,
      name: input.name,
      instructor_id: input.instructorId ?? null,
      age_min: input.ageMin ?? null,
      age_max: input.ageMax ?? null,
      max_capacity: input.maxCapacity,
    })
    .select(GROUP_COLUMNS)
    .single();

  if (error) throw error;

  if (input.schedules.length > 0) {
    const { error: schedulesError } = await supabase.from("academy_group_schedules").insert(
      input.schedules.map((schedule) => ({
        business_id: businessId,
        group_id: data.id,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
      })),
    );
    if (schedulesError) throw schedulesError;
  }

  return toGroup(data);
}

export async function updateGroup(
  id: string,
  businessId: string,
  input: GroupInput,
): Promise<AcademyGroup> {
  const { data, error } = await supabase
    .from("academy_groups")
    .update({
      name: input.name,
      instructor_id: input.instructorId ?? null,
      age_min: input.ageMin ?? null,
      age_max: input.ageMax ?? null,
      max_capacity: input.maxCapacity,
    })
    .eq("id", id)
    .select(GROUP_COLUMNS)
    .single();

  if (error) throw error;

  const { error: deleteError } = await supabase
    .from("academy_group_schedules")
    .delete()
    .eq("group_id", id);
  if (deleteError) throw deleteError;

  if (input.schedules.length > 0) {
    const { error: schedulesError } = await supabase.from("academy_group_schedules").insert(
      input.schedules.map((schedule) => ({
        business_id: businessId,
        group_id: id,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
      })),
    );
    if (schedulesError) throw schedulesError;
  }

  return toGroup(data);
}
