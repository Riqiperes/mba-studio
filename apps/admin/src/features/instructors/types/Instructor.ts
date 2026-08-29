/**
 * Forma en camelCase de una fila de `instructors` (ver
 * supabase/migrations/003_instructors.sql). El mapeo snake_case ->
 * camelCase vive en features/instructors/services/instructorsService.ts.
 */
export type Instructor = {
  id: string;
  businessId: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
