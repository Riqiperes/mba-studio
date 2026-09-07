import { supabase } from "@/lib/supabaseClient";
import type { AcademyGroupCatalogItem, AcademyGroupSchedule } from "../types/AcademyGroup";

const GROUP_COLUMNS = "id, name, instructor_id, age_min, age_max";
const SCHEDULE_COLUMNS = "id, day_of_week, start_time, end_time";

type ScheduleRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type GroupRow = {
  id: string;
  name: string;
  instructor_id: string | null;
  age_min: number | null;
  age_max: number | null;
  instructors: { full_name: string } | null;
  academy_group_schedules: ScheduleRow[];
};

function toSchedule(row: ScheduleRow): AcademyGroupSchedule {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

export async function listActiveAcademyGroups(): Promise<AcademyGroupCatalogItem[]> {
  const { data, error } = await supabase
    .from("academy_groups")
    .select(`${GROUP_COLUMNS}, instructors(full_name), academy_group_schedules(${SCHEDULE_COLUMNS})`)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data as GroupRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    instructorName: row.instructors?.full_name ?? null,
    ageMin: row.age_min,
    ageMax: row.age_max,
    schedules: row.academy_group_schedules.map(toSchedule),
  }));
}
