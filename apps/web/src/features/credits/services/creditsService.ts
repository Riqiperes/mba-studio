// apps/web/src/features/credits/services/creditsService.ts
import { supabase } from "@/lib/supabaseClient";

export async function getMyCreditBalance(): Promise<number> {
  const { data, error } = await supabase
    .from("customer_credits_ledger")
    .select("delta");

  if (error) throw error;
  return data.reduce((sum, row) => sum + row.delta, 0);
}