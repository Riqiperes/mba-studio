import { supabase } from "@/lib/supabaseClient";
import type { Package } from "../types/Package";

const SELECT_COLUMNS =
  "id, business_id, name, description, credits, price_cents, currency, valid_days, active, created_at, updated_at";

type PackageRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  credits: number;
  price_cents: number;
  currency: string;
  valid_days: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toPackage(row: PackageRow): Package {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    credits: row.credits,
    priceCents: row.price_cents,
    currency: row.currency,
    validDays: row.valid_days,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from("packages")
    .select(SELECT_COLUMNS)
    .order("name", { ascending: true });

  if (error) throw error;
  return data.map(toPackage);
}

export async function createPackage(
  businessId: string,
  input: {
    name: string;
    description?: string | null;
    credits: number;
    price: number;
    validDays?: number | null;
  },
): Promise<Package> {
  const { data, error } = await supabase
    .from("packages")
    .insert({
      business_id: businessId,
      name: input.name,
      description: input.description ?? null,
      credits: input.credits,
      price_cents: Math.round(input.price * 100),
      valid_days: input.validDays ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toPackage(data);
}

export async function updatePackage(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    credits?: number;
    price?: number;
    validDays?: number | null;
  },
): Promise<Package> {
  const updateData: {
    name?: string;
    description?: string | null;
    credits?: number;
    price_cents?: number;
    valid_days?: number | null;
  } = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.credits !== undefined) updateData.credits = input.credits;
  if (input.price !== undefined) updateData.price_cents = Math.round(input.price * 100);
  if (input.validDays !== undefined) updateData.valid_days = input.validDays;

  const { data, error } = await supabase
    .from("packages")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toPackage(data);
}

export async function setPackageActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("packages").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deletePackage(id: string): Promise<void> {
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) throw error;
}
