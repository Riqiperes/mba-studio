// apps/web/src/features/bookings/services/bookingsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { Booking, BookingWithClass } from "../types/Booking";
import type { WaitlistEntry, WaitlistEntryWithClass } from "../types/WaitlistEntry";

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

type BookingWithClassRow = BookingRow & {
  studio_classes: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    instructors: { full_name: string } | null;
  } | null;
};

type WaitlistWithClassRow = WaitlistRow & {
  studio_classes: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    instructors: { full_name: string } | null;
  } | null;
};

function toBookingWithClass(row: BookingWithClassRow): BookingWithClass {
  return {
    ...toBooking(row),
    class: row.studio_classes
      ? {
          id: row.studio_classes.id,
          title: row.studio_classes.title,
          startsAt: row.studio_classes.starts_at,
          endsAt: row.studio_classes.ends_at,
          instructorName: row.studio_classes.instructors?.full_name ?? null,
        }
      : {
          id: row.class_id,
          title: "Clase eliminada",
          startsAt: "",
          endsAt: "",
          instructorName: null,
        },
  };
}

export async function listMyBookings(): Promise<BookingWithClass[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, studio_classes(id, title, starts_at, ends_at, instructors(full_name))`)
    .eq("status", "CONFIRMED")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as BookingWithClassRow[]).map(toBookingWithClass);
}

/**
 * Reservaciones que la academia cancelo al cancelar la clase (trigger de la
 * migracion 034, que ya devolvio el credito). Solo clases que aun no pasan:
 * es el aviso de "Mi horario".
 */
export async function listMyBookingsCancelledByBusiness(): Promise<BookingWithClass[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, studio_classes!inner(id, title, starts_at, ends_at, instructors(full_name))`)
    .eq("status", "CANCELLED")
    .eq("cancelled_by_business", true)
    .gte("studio_classes.starts_at", new Date().toISOString())
    .order("cancelled_at", { ascending: false });

  if (error) throw error;
  return (data as BookingWithClassRow[]).map(toBookingWithClass);
}

export async function listMyWaitlist(): Promise<WaitlistEntryWithClass[]> {
  const { data, error } = await supabase
    .from("waitlist")
    .select(`${WAITLIST_COLUMNS}, studio_classes(id, title, starts_at, ends_at, instructors(full_name))`)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Calcular posición FIFO (1-based) por clase
  const positionByClass = new Map<string, number>();
  const entries = (data as WaitlistWithClassRow[]).map((row) => {
    const classId = row.class_id;
    const pos = (positionByClass.get(classId) ?? 0) + 1;
    positionByClass.set(classId, pos);
    return {
      ...toWaitlistEntry(row),
      class: row.studio_classes
        ? {
            id: row.studio_classes.id,
            title: row.studio_classes.title,
            startsAt: row.studio_classes.starts_at,
            endsAt: row.studio_classes.ends_at,
            instructorName: row.studio_classes.instructors?.full_name ?? null,
          }
        : {
            id: row.class_id,
            title: "Clase eliminada",
            startsAt: "",
            endsAt: "",
            instructorName: null,
          },
      position: pos,
    };
  });

  return entries;
}

export async function bookClass(classId: string): Promise<Booking> {
  // getSession() lee la sesion en cache (sin red); getUser() la revalida
  // contra el servidor en cada llamada -- innecesario aqui, la RPC ya
  // valida todo server-side.
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase.rpc("book_class", {
    p_customer_id: userId,
    p_class_id: classId,
  });
  if (error) throw error;
  return toBooking(data as BookingRow);
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw error;
}

export async function joinWaitlist(classId: string, businessId?: string): Promise<WaitlistEntry> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Usuario no autenticado");

  // El caller ya conoce el business_id de la clase (viene en la lista que
  // cargo); solo se consulta si no se paso, para no perder una vuelta de
  // red completa en el camino comun.
  let resolvedBusinessId = businessId;
  if (!resolvedBusinessId) {
    const { data: businessData, error: bizError } = await supabase
      .from("studio_classes")
      .select("business_id")
      .eq("id", classId)
      .single();
    if (bizError) throw bizError;
    resolvedBusinessId = businessData.business_id;
  }

  const { data, error } = await supabase
    .from("waitlist")
    .insert({
      business_id: resolvedBusinessId,
      class_id: classId,
      customer_id: userId,
    })
    .select(WAITLIST_COLUMNS)
    .single();

  if (error) throw error;
  return toWaitlistEntry(data);
}

export async function leaveWaitlist(waitlistId: string): Promise<void> {
  const { error } = await supabase.from("waitlist").delete().eq("id", waitlistId);
  if (error) throw error;
}