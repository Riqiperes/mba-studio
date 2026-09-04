/**
 * Forma en camelCase de una fila de `studio_classes` (ver
 * supabase/migrations/004_studio_classes.sql). El mapeo snake_case ->
 * camelCase vive en features/classes/services/classesService.ts.
 */
export type StudioClassStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export type StudioClass = {
  id: string;
  businessId: string;
  instructorId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  maxCapacity: number;
  status: StudioClassStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClassFilters = {
  instructorId?: string;
  status?: StudioClassStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateClassesInput = {
  instructorId: string;
  title: string;
  weekdays: number[]; // 0=Domingo .. 6=Sabado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  maxCapacity: number;
  weekStart: string; // YYYY-MM-DD, Domingo de la semana de referencia
  weeksCount: number;
};

export type CreateClassesResult = {
  created: StudioClass[];
  skipped: { startsAt: string; reason: string }[];
};

export type UpdateClassInput = {
  instructorId?: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  maxCapacity?: number;
};
