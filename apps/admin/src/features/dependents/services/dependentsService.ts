import { supabase } from "@/lib/supabaseClient";
import type { Dependent, DependentWithGuardian } from "../types/Dependent";

const SELECT_COLUMNS =
  "id, business_id, guardian_id, full_name, birth_date, active, created_at, updated_at";

type DependentRow = {
  id: string;
  business_id: string;
  guardian_id: string;
  full_name: string;
  birth_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toDependent(row: DependentRow): Dependent {
  return {
    id: row.id,
    businessId: row.business_id,
    guardianId: row.guardian_id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDependentsByGuardian(guardianId: string): Promise<Dependent[]> {
  const { data, error } = await supabase
    .from("dependents")
    .select(SELECT_COLUMNS)
    .eq("guardian_id", guardianId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data.map(toDependent);
}

type DependentWithGuardianRow = DependentRow & {
  profiles: { full_name: string | null } | null;
};

export async function listAllDependents(): Promise<DependentWithGuardian[]> {
  const { data, error } = await supabase
    .from("dependents")
    .select(`${SELECT_COLUMNS}, profiles(full_name)`)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data as DependentWithGuardianRow[]).map((row) => ({
    ...toDependent(row),
    guardianName: row.profiles?.full_name ?? null,
  }));
}

export async function createDependent(
  businessId: string,
  guardianId: string,
  input: { fullName: string; birthDate?: string | null },
): Promise<Dependent> {
  const { data, error } = await supabase
    .from("dependents")
    .insert({
      business_id: businessId,
      guardian_id: guardianId,
      full_name: input.fullName,
      birth_date: input.birthDate ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data);
}

export async function updateDependent(
  id: string,
  input: { fullName?: string; birthDate?: string | null },
): Promise<Dependent> {
  const updateData: { full_name?: string; birth_date?: string | null } = {};

  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.birthDate !== undefined) updateData.birth_date = input.birthDate;

  const { data, error } = await supabase
    .from("dependents")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data);
}

export async function setDependentActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("dependents").update({ active }).eq("id", id);
  if (error) throw error;
}
