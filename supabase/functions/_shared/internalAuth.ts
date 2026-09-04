// `send-whatsapp` y `notifications` son funciones internas: las llama otra
// Edge Function o un trigger de base de datos, nunca el frontend
// directamente. Verificar el JWT de Supabase (verify_jwt, default) no
// alcanza para bloquear a un usuario final: la anon key tambien es un JWT
// valido. Por eso exigen ademas que el Authorization header sea
// exactamente la service role key -- el mismo secreto que ya viven solo en
// Edge Functions (nunca en frontend), consistente con `docs/security.md`.
export function requireServiceRole(req: Request): Response | null {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey || token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
