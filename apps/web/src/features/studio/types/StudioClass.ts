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

export type StudioClassWithInstructor = StudioClass & {
  instructorName: string | null;
};

export type ClassFilters = {
  instructorId?: string;
  status?: StudioClassStatus;
  dateFrom?: string;
  dateTo?: string;
};