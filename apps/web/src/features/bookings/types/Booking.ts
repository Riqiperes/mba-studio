// apps/web/src/features/bookings/types/Booking.ts

export type BookingStatus = "CONFIRMED" | "CANCELLED";

export type Booking = {
  id: string;
  businessId: string;
  classId: string;
  customerId: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type BookingWithClass = Booking & {
  class: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    instructorName: string | null;
  };
};