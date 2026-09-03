/**
 * Forma en camelCase de una fila de `dependents` (ver
 * supabase/migrations/010_dependents.sql y
 * supabase/migrations/013_dependents_unregistered_guardians.sql).
 * La UI siempre muestra este concepto como "Alumno", nunca "Dependiente" --
 * ver docs/superpowers/specs/2026-08-29-admin-customers-design.md. El mapeo
 * snake_case -> camelCase vive en
 * features/dependents/services/dependentsService.ts.
 */
export type Dependent = {
  id: string;
  businessId: string;
  guardianId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  fullName: string;
  birthDate: string | null;
  age: number | null;
  medicalConditions: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Usado por la vista global de alumnos (`StudentsPage`). */
export type DependentWithGuardian = Dependent & {
  guardianName: string | null;
  guardianPhone: string | null;
};
