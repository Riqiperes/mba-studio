/**
 * Forma en camelCase de una fila de `academy_enrollments` (ver
 * supabase/migrations/012_academy_groups.sql).
 */
export type AcademyEnrollment = {
  id: string;
  businessId: string;
  dependentId: string;
  groupId: string;
  enrollmentDate: string;
  status: "ACTIVA" | "BAJA";
  createdAt: string;
  updatedAt: string;
};

/** Usado en la tabla de inscritos de un grupo, con nombre de alumno/tutor. */
export type AcademyEnrollmentWithStudent = AcademyEnrollment & {
  studentName: string;
  guardianName: string | null;
  /** Descuento por referido del tutor (0 si no tiene cuenta o no tiene descuento). */
  guardianDiscountPercent: number;
};
