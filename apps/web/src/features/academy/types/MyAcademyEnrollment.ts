export type MyAcademyEnrollmentStatus = "PENDIENTE" | "ACTIVA" | "BAJA" | "MUESTRA";

export type MyAcademyEnrollment = {
  id: string;
  dependentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  status: MyAcademyEnrollmentStatus;
  enrollmentDate: string;
  trialDate: string | null;
  createdAt: string;
};
