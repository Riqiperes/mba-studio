import type { UserRole } from "@mba-studio/shared";

/**
 * Fila devuelta por la RPC `list_business_profiles()` (ver
 * supabase/migrations/021_users_admin_and_instructor_rls.sql). Combina
 * `profiles` con `auth.users.email` -- el email no vive en `profiles`, y
 * solo BUSINESS_ADMIN/SUPER_ADMIN pueden verlo (la RPC lo restringe).
 */
export type BusinessUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  instructorId: string | null;
  discountPercent: number;
  createdAt: string;
};
