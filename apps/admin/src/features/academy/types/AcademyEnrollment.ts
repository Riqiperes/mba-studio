/**
 * Forma en camelCase de una fila de `academy_enrollments` (ver
 * supabase/migrations/012_academy_groups.sql y
 * supabase/migrations/027_academy_self_enrollment.sql).
 */
export type AcademyEnrollment = {
  id: string;
  businessId: string;
  dependentId: string;
  groupId: string;
  enrollmentDate: string;
  status: "ACTIVA" | "BAJA" | "PENDIENTE" | "MUESTRA";
  scheduleId: string | null;
  trialDate: string | null;
  registrationFeePaid: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Usado en la tabla de inscritos/solicitudes de un grupo, con nombre de alumno/tutor. */
export type AcademyEnrollmentWithStudent = AcademyEnrollment & {
  studentName: string;
  guardianName: string | null;
  /** Descuento por referido del tutor (0 si no tiene cuenta o no tiene descuento). */
  guardianDiscountPercent: number;
  /** Solo para status = 'MUESTRA': dia/horario elegido, formateado ("Lun 16:00-17:00"). */
  scheduleLabel: string | null;
};
