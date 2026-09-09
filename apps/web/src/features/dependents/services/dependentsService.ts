import { supabase } from "@/lib/supabaseClient";
import type { Dependent } from "../types/Dependent";

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

export async function listMyDependents(): Promise<Dependent[]> {
  const { data, error } = await supabase
    .from("dependents")
    .select(SELECT_COLUMNS)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data as DependentRow[]).map(toDependent);
}

export async function createMyDependent(
  businessId: string,
  input: { fullName: string; birthDate: string | null },
): Promise<Dependent> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("dependents")
    .insert({
      business_id: businessId,
      guardian_id: userData.user.id,
      full_name: input.fullName,
      birth_date: input.birthDate,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data as DependentRow);
}
