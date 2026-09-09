/**
 * Forma en camelCase de una fila de `dependents` propia del cliente
 * autenticado (ver supabase/migrations/010_dependents.sql y
 * supabase/migrations/027_academy_self_enrollment.sql para la RLS de
 * autoservicio). La UI siempre muestra este concepto como "Alumno", nunca
 * "Dependiente" -- mismo criterio que apps/admin/src/features/dependents.
 */
export type Dependent = {
  id: string;
  businessId: string;
  guardianId: string;
  fullName: string;
  birthDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
