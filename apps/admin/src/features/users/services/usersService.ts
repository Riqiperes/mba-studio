import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@mba-studio/shared";
import type { BusinessUser } from "../types/User";

type BusinessUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  instructor_id: string | null;
  discount_percent: number;
  created_at: string;
};

function toBusinessUser(row: BusinessUserRow): BusinessUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    instructorId: row.instructor_id,
    discountPercent: row.discount_percent,
    createdAt: row.created_at,
  };
}

export async function listBusinessUsers(): Promise<BusinessUser[]> {
  const { data, error } = await supabase.rpc("list_business_profiles");
  if (error) throw error;
  return (data as BusinessUserRow[]).map(toBusinessUser);
}

// Actualizacion directa sobre `profiles`: RLS (`profiles_update_own_or_staff`)
// mas el trigger `prevent_profile_privilege_escalation` (007) ya protegen
// esto -- solo BUSINESS_ADMIN/SUPER_ADMIN pueden cambiar role, y solo
// SUPER_ADMIN puede otorgar SUPER_ADMIN (el trigger revierte en silencio
// si no, por eso la UI no debe ofrecer esa opcion a un BUSINESS_ADMIN).
export async function updateUserRole(
  profileId: string,
  role: UserRole,
  instructorId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ role, instructor_id: instructorId })
    .eq("id", profileId);
  if (error) throw error;
}
