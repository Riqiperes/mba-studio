export type TuitionPeriod = {
  id: string;
  businessId: string;
  groupId: string;
  dayOfMonth: number | null;
  amountCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TuitionPeriodInput = {
  groupId: string;
  dayOfMonth: number | null;
  amountCents: number;
  active?: boolean;
};