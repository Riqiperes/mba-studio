import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "../types/profile";

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, business_id, role, full_name, phone, instructor_id, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    businessId: data.business_id,
    role: data.role,
    fullName: data.full_name,
    phone: data.phone,
    instructorId: data.instructor_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function subscribeToAuthChanges(
  callback: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}
