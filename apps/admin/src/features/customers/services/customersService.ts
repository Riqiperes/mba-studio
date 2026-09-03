import { supabase } from "@/lib/supabaseClient";
import type { Customer } from "../types/Customer";

const SELECT_COLUMNS = "id, business_id, full_name, phone, discount_percent, created_at, updated_at";

type CustomerRow = {
  id: string;
  business_id: string;
  full_name: string | null;
  phone: string | null;
  discount_percent: number;
  created_at: string;
  updated_at: string;
};

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    fullName: row.full_name,
    phone: row.phone,
    discountPercent: row.discount_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT_COLUMNS)
    .eq("role", "CUSTOMER")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data.map(toCustomer);
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .single();

  if (error) throw error;
  return toCustomer(data);
}

export async function updateCustomer(
  id: string,
  input: { fullName?: string; phone?: string | null; discountPercent?: number },
): Promise<Customer> {
  const updateData: { full_name?: string; phone?: string | null; discount_percent?: number } = {};

  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.discountPercent !== undefined) updateData.discount_percent = input.discountPercent;

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toCustomer(data);
}
