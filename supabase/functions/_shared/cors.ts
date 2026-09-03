// CORS compartido por todas las Edge Functions. Estas funciones son
// server-to-server (llamadas desde otras Edge Functions o triggers), pero
// se deja el preflight resuelto por si alguna necesita invocarse desde el
// navegador en el futuro.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
