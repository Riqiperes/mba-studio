import { supabase } from "@/lib/supabaseClient";
import type { Dependent, DependentWithGuardian } from "../types/Dependent";

const SELECT_COLUMNS =
  "id, business_id, guardian_id, guardian_name, guardian_phone, full_name, birth_date, active, created_at, updated_at";

type DependentRow = {
  id: string;
  business_id: string;
  guardian_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
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
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
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
  return (data as DependentRow[]).map(toDependent);
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
    guardianName: row.guardian_name ?? row.profiles?.full_name ?? null,
    guardianPhone: row.guardian_phone ?? null,
  }));
}

export type CreateDependentInput = {
  fullName: string;
  birthDate?: string | null;
  guardianId?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

export async function createDependent(
  businessId: string,
  input: CreateDependentInput,
): Promise<Dependent> {
  const { data, error } = await supabase
    .from("dependents")
    .insert({
      business_id: businessId,
      guardian_id: input.guardianId ?? null,
      guardian_name: input.guardianName ?? null,
      guardian_phone: input.guardianPhone ?? null,
      full_name: input.fullName,
      birth_date: input.birthDate ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data as DependentRow);
}

export type UpdateDependentInput = {
  fullName?: string;
  birthDate?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

export async function updateDependent(
  id: string,
  input: UpdateDependentInput,
): Promise<Dependent> {
  const updateData: {
    full_name?: string;
    birth_date?: string | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
  } = {};

  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.birthDate !== undefined) updateData.birth_date = input.birthDate;
  if (input.guardianName !== undefined) updateData.guardian_name = input.guardianName;
  if (input.guardianPhone !== undefined) updateData.guardian_phone = input.guardianPhone;

  const { data, error } = await supabase
    .from("dependents")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data as DependentRow);
}

export async function setDependentActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("dependents").update({ active }).eq("id", id);
  if (error) throw error;
}

