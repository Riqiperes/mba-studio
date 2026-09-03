import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "../types/profile";

const PROFILE_COLUMNS = "id, business_id, role, full_name, phone, medical_conditions, created_at, updated_at";

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo || window.location.origin },
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  redirectTo?: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const options: { data: { full_name: string }; emailRedirectTo?: string } = {
    data: { full_name: fullName },
  };
  if (redirectTo) {
    options.emailRedirectTo = redirectTo;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options,
  });

  if (error) throw error;

  return { needsEmailConfirmation: !data.session };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    businessId: data.business_id,
    role: data.role,
    fullName: data.full_name,
    phone: data.phone,
    medicalConditions: data.medical_conditions,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateProfile(
  userId: string,
  input: { fullName: string | null; phone: string | null; medicalConditions?: string | null },
): Promise<Profile> {
  const updateData: {
    full_name: string | null;
    phone: string | null;
    medical_conditions?: string | null;
    updated_at: string;
  } = {
    full_name: input.fullName,
    phone: input.phone,
    updated_at: new Date().toISOString(),
  };
  if (input.medicalConditions !== undefined) updateData.medical_conditions = input.medicalConditions;

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    businessId: data.business_id,
    role: data.role,
    fullName: data.full_name,
    phone: data.phone,
    medicalConditions: data.medical_conditions,
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
