import { supabase } from "@/lib/supabaseClient";
import type { Booking, BookingWithCustomer } from "../types/Booking";
import type { WaitlistEntry, WaitlistEntryWithCustomer } from "../types/WaitlistEntry";

const BOOKING_COLUMNS = "id, business_id, class_id, customer_id, status, created_at, updated_at";
const WAITLIST_COLUMNS = "id, business_id, class_id, customer_id, created_at";

type BookingRow = {
  id: string;
  business_id: string;
  class_id: string;
  customer_id: string;
  status: Booking["status"];
  created_at: string;
  updated_at: string;
};

type WaitlistRow = {
  id: string;
  business_id: string;
  class_id: string;
  customer_id: string;
  created_at: string;
};

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    businessId: row.business_id,
    classId: row.class_id,
    customerId: row.customer_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWaitlistEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    businessId: row.business_id,
    classId: row.class_id,
    customerId: row.customer_id,
    createdAt: row.created_at,
  };
}

type BookingWithCustomerRow = BookingRow & { profiles: { full_name: string | null } | null };
type WaitlistWithCustomerRow = WaitlistRow & { profiles: { full_name: string | null } | null };

export async function listBookingsByClass(classId: string): Promise<BookingWithCustomer[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, profiles(full_name)`)
    .eq("class_id", classId)
    .eq("status", "CONFIRMED")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as BookingWithCustomerRow[]).map((row) => ({
    ...toBooking(row),
    customerName: row.profiles?.full_name ?? null,
  }));
}

export async function listWaitlistByClass(classId: string): Promise<WaitlistEntryWithCustomer[]> {
  const { data, error } = await supabase
    .from("waitlist")
    .select(`${WAITLIST_COLUMNS}, profiles(full_name)`)
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as WaitlistWithCustomerRow[]).map((row) => ({
    ...toWaitlistEntry(row),
    customerName: row.profiles?.full_name ?? null,
  }));
}

export async function bookClass(customerId: string, classId: string): Promise<Booking> {
  const { data, error } = await supabase.rpc("book_class", {
    p_customer_id: customerId,
    p_class_id: classId,
  });
  if (error) throw error;
  return toBooking(data as BookingRow);
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw error;
}

export async function addToWaitlist(
  businessId: string,
  classId: string,
  customerId: string,
): Promise<WaitlistEntry> {
  const { data, error } = await supabase
    .from("waitlist")
    .insert({ business_id: businessId, class_id: classId, customer_id: customerId })
    .select(WAITLIST_COLUMNS)
    .single();

  if (error) throw error;
  return toWaitlistEntry(data);
}

export async function removeFromWaitlist(id: string): Promise<void> {
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) throw error;
}

export async function promoteFromWaitlist(waitlistId: string): Promise<Booking> {
  const { data, error } = await supabase.rpc("promote_from_waitlist", {
    p_waitlist_id: waitlistId,
  });
  if (error) throw error;
  return toBooking(data as BookingRow);
}
