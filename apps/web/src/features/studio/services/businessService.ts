import { supabase } from "@/lib/supabaseClient";

export type Business = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  createdAt: string;
  updatedAt: string;
};

const SELECT_COLUMNS =
  "id, name, description, address, phone, whatsapp_number, logo_url, favicon_url, primary_color, accent_color, created_at, updated_at";

type BusinessRow = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
};

function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    address: row.address,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBusiness(): Promise<Business | null> {
  const { data, error } = await supabase
    .from("business")
    .select(SELECT_COLUMNS)
    .limit(1)
    .single();

  if (error) {
    console.error("[business] getBusiness fallo", error);
    return null;
  }

  return toBusiness(data);
}