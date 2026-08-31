export type PaymentStatus = 'PAGADO' | 'NO_PAGADO';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';

export type AcademyPayment = {
  id: string;
  businessId: string;
  enrollmentId: string;
  periodStart: string;
  periodEnd: string;
  status: PaymentStatus;
  amountCents: number;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcademyPaymentWithEnrollment = AcademyPayment & {
  enrollment: {
    id: string;
    dependentId: string;
    groupId: string;
    dependent: {
      fullName: string;
      guardianName: string | null;
      guardianPhone: string | null;
    };
    group: {
      name: string;
    };
  };
};

export type PaymentInput = {
  periodStart: string;
  periodEnd: string;
  status: PaymentStatus;
  amountCents: number;
  paidAt?: string | null;
  paymentMethod?: PaymentMethod | null;
  reference?: string | null;
};

export type OverduePayment = AcademyPaymentWithEnrollment & {
  daysOverdue: number;
};