// Cancela la suscripcion de Stripe de una inscripcion de Academia. La
// llama apps/admin cuando el staff da de baja a un alumno
// (withdrawEnrollment) para no seguir cobrandole la colegiatura mensual.
// Solo puede cancelar la suscripcion de una inscripcion que el usuario que
// llama puede leer via RLS (staff del negocio, o el propio tutor del
// alumno) -- ver academy_enrollments RLS en supabase/migrations/.
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";
import { logError } from "../_shared/logger.ts";

const STRIPE_API_VERSION = "2026-06-24.dahlia" as const;

interface CancelBody {
  enrollmentId: string;
}

function isValidBody(body: unknown): body is CancelBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as CancelBody).enrollmentId === "string"
  );
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Falta autenticacion", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body invalido, se esperaba JSON");
  }

  if (!isValidBody(body)) {
    return errorResponse("Se requiere { enrollmentId: string }");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !stripeSecretKey) {
    return errorResponse("Configuracion de servidor incompleta", 500);
  }

  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: enrollment, error: fetchError } = await supabaseAsUser
    .from("academy_enrollments")
    .select("id, stripe_subscription_id")
    .eq("id", body.enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    return errorResponse("Inscripcion no encontrada", 404);
  }

  if (!enrollment.stripe_subscription_id) {
    return jsonResponse({ cancelled: false, reason: "sin_suscripcion" });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
    await stripe.subscriptions.cancel(enrollment.stripe_subscription_id);
    return jsonResponse({ cancelled: true });
  } catch (error) {
    logError("stripe-cancel-subscription.failed", error, { enrollmentId: body.enrollmentId });
    return errorResponse("No se pudo cancelar la suscripcion", 502);
  }
});
