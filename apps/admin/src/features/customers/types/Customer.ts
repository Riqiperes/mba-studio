/**
 * Forma en camelCase de una fila de `profiles` con rol CUSTOMER (ver
 * supabase/migrations/002_profiles.sql). El mapeo snake_case ->
 * camelCase vive en features/customers/services/customersService.ts.
 */
export type Customer = {
  id: string;
  businessId: string;
  fullName: string | null;
  phone: string | null;
  /** Descuento por referido (0-100), aplicable solo a colegiaturas de Academia/Ballet. */
  discountPercent: number;
  medicalConditions: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
