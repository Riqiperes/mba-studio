import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@mba-studio/shared";
import type { AdminInvite, AdminInviteRole } from "../types/AdminInvite";

type AdminInviteRow = {
  email: string;
  role: UserRole;
  created_at: string;
  registered: boolean;
};

function toAdminInvite(row: AdminInviteRow): AdminInvite {
  return {
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    registered: row.registered,
  };
}

export async function listAdminInvites(): Promise<AdminInvite[]> {
  const { data, error } = await supabase.rpc("list_admin_invites");
  if (error) throw error;
  return (data as AdminInviteRow[]).map(toAdminInvite);
}

export async function addAdminInvite(email: string, role: AdminInviteRole): Promise<void> {
  const { error } = await supabase.rpc("add_admin_invite", { p_email: email, p_role: role });
  if (error) throw error;
}

export async function removeAdminInvite(email: string): Promise<void> {
  const { error } = await supabase.rpc("remove_admin_invite", { p_email: email });
  if (error) throw error;
}
