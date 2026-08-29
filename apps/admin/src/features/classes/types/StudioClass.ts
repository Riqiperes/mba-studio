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
