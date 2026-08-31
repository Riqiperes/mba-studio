/**
 * Forma en camelCase de una fila de `academy_groups` (ver
 * supabase/migrations/012_academy_groups.sql). El mapeo snake_case ->
 * camelCase vive en features/academy/services/academyGroupsService.ts.
 */
export type AcademyGroup = {
  id: string;
  businessId: string;
  name: string;
  instructorId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Forma en camelCase de una fila de `academy_group_schedules`. */
export type AcademyGroupSchedule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

/** Usado en la tabla de grupos, con instructor/horario/conteo de inscritos. */
export type AcademyGroupWithDetails = AcademyGroup & {
  instructorName: string | null;
  schedules: AcademyGroupSchedule[];
  enrolledCount: number;
};

/** Un horario dentro del formulario de grupo, antes de tener `id`. */
export type GroupScheduleInput = { dayOfWeek: number; startTime: string; endTime: string };

/** Payload de crear/editar un grupo (reemplaza todos sus horarios). */
export type GroupInput = {
  name: string;
  instructorId?: string | null;
  schedules: GroupScheduleInput[];
};
