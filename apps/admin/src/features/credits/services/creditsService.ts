import { supabase } from "@/lib/supabaseClient";

export async function getCreditBalance(customerId: string): Promise<number> {
  const { data, error } = await supabase
    .from("customer_credits_ledger")
    .select("delta")
    .eq("customer_id", customerId);

  if (error) throw error;
  return data.reduce((sum, row) => sum + row.delta, 0);
}

export async function grantCredits(
  customerId: string,
  amount: number,
  notes?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("grant_credits", {
    p_customer_id: customerId,
    p_amount: amount,
    // p_notes es opcional (string) en el RPC, no nullable: se omite en vez de mandar null,
    // para cumplir con exactOptionalPropertyTypes.
    ...(notes != null ? { p_notes: notes } : {}),
  });
  if (error) throw error;
}
