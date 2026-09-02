// apps/web/src/features/bookings/types/WaitlistEntry.ts

export type WaitlistEntry = {
  id: string;
  businessId: string;
  classId: string;
  customerId: string;
  createdAt: string;
};

export type WaitlistEntryWithClass = WaitlistEntry & {
  class: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    instructorName: string | null;
  };
  position: number; // 1-based FIFO position
};