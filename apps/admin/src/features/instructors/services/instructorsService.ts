import { supabase } from "@/lib/supabaseClient";
import type { Instructor } from "../types/Instructor";

const SELECT_COLUMNS =
  "id, business_id, full_name, bio, photo_url, active, created_at, updated_at";

type InstructorRow = {
  id: string;
  business_id: string;
  full_name: string;
  bio: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toInstructor(row: InstructorRow): Instructor {
  return {
    id: row.id,
    businessId: row.business_id,
    fullName: row.full_name,
    bio: row.bio,
    photoUrl: row.photo_url,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listInstructors(): Promise<Instructor[]> {
  const { data, error } = await supabase
    .from("instructors")
    .select(SELECT_COLUMNS)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data.map(toInstructor);
}

export async function createInstructor(
  businessId: string,
  input: { fullName: string; bio?: string | null; photoUrl?: string | null },
): Promise<Instructor> {
  const { data, error } = await supabase
    .from("instructors")
    .insert({
      business_id: businessId,
      full_name: input.fullName,
      bio: input.bio ?? null,
      photo_url: input.photoUrl ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toInstructor(data);
}

export async function updateInstructor(
  id: string,
  input: { fullName?: string; bio?: string | null; photoUrl?: string | null },
): Promise<Instructor> {
  const updateData: Record<string, string | null> = {};

  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.photoUrl !== undefined) updateData.photo_url = input.photoUrl;

  const { data, error } = await supabase
    .from("instructors")
    .update(updateData as any)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toInstructor(data);
}

export async function setInstructorActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("instructors").update({ active }).eq("id", id);
  if (error) throw error;
}
