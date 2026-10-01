// Crea una Stripe Checkout Session para la inscripcion de Academia. Si el
// grupo tiene una colegiatura mensual configurada
// (academy_tuition_periods), se cobra SOLO la mensualidad recurrente (sin
// la cuota de inscripcion por separado -- decision de negocio). Si no
// tiene colegiatura, se cobra la cuota de inscripcion unica de siempre.
// Todos los alumnos con colegiatura se facturan el dia 1 de cada mes (ver
// docs/payments.md). La llama apps/web (usuario autenticado). No otorga
// nada ni marca ningun pago: eso lo hace unicamente stripe-webhook cuando
// Stripe confirma el pago.
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";
import { logError } from "../_shared/logger.ts";

const STRIPE_API_VERSION = "2026-06-24.dahlia" as const;

interface CheckoutBody {
  enrollmentId: string;
}

function isValidBody(body: unknown): body is CheckoutBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as CheckoutBody).enrollmentId === "string"
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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
    return errorResponse("Configuracion de servidor incompleta", 500);
  }

  // Cliente scoped al usuario que llama: respeta RLS, nunca vemos ni
  // tocamos inscripciones/alumnos ajenos.
  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: enrollment, error: fetchError } = await supabaseAsUser
    .from("academy_enrollments")
    .select("id, group_id, registration_fee_paid, business(academy_registration_fee_cents)")
    .eq("id", body.enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    return errorResponse("Solicitud de inscripcion no encontrada", 404);
  }

  if (enrollment.registration_fee_paid) {
    return errorResponse("La cuota de inscripcion ya esta pagada", 400);
  }

  // Lectura de la colegiatura del grupo con la service role: no es dato
  // sensible del usuario (lo configura el staff), y evita tener que abrir
  // una policy de RLS publica nueva sobre academy_tuition_periods solo
  // para este caso.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: tuitionPeriod } = await supabaseAdmin
    .from("academy_tuition_periods")
    .select("amount_cents")
    .eq("group_id", enrollment.group_id)
    .eq("active", true)
    .maybeSingle();

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: { enrollment_id: enrollment.id },
    success_url: `${origin}/profile?pago=procesando`,
    cancel_url: `${origin}/academy?pago=cancelado`,
    mode: "payment",
  };

  const tuitionCents = tuitionPeriod?.amount_cents;
  if (tuitionCents && tuitionCents > 0) {
    // Grupo con colegiatura mensual: se cobra SOLO la mensualidad, sin la
    // cuota de inscripcion por separado (decision de negocio). Todos los
    // alumnos con colegiatura se facturan el dia 1 de cada mes
    // (billing_cycle_anchor_config), sin importar el dia en que se
    // inscribieron.
    lineItems.push({
      price_data: {
        currency: "mxn",
        product_data: { name: "Colegiatura mensual - Academia" },
        recurring: { interval: "month" },
        unit_amount: tuitionCents,
      },
      quantity: 1,
    });
    sessionParams.mode = "subscription";
    sessionParams.subscription_data = {
      metadata: { enrollment_id: enrollment.id },
      billing_cycle_anchor_config: { day_of_month: 1 },
    };
  } else {
    // Sin colegiatura configurada: cobro unico de la cuota de inscripcion,
    // como antes.
    const feeCents = enrollment.business?.academy_registration_fee_cents;
    if (!feeCents || feeCents <= 0) {
      return errorResponse("La cuota de inscripcion no esta configurada", 500);
    }
    lineItems.push({
      price_data: {
        currency: "mxn",
        product_data: { name: "Cuota de inscripcion - Academia" },
        unit_amount: feeCents,
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return jsonResponse({ url: session.url });
  } catch (error) {
    logError("stripe-checkout.session_create_failed", error, { enrollmentId: body.enrollmentId });
    return errorResponse("No se pudo iniciar el pago", 502);
  }
});
