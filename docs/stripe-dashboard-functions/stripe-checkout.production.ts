// stripe-checkout -- version PRODUCTION para pegar en el Dashboard de Supabase.
//
// Proyecto: MBA-STUDIO-PROD (nnabpthdclgggpxysyxs) -- produccion
// Secrets esperados: sk_live_... / rk_live_... y el whsec_ del webhook de LIVE mode
// JWT verification: ACTIVADA (default)
//
// Este archivo y su gemelo (stripe-checkout.test.ts) son IDENTICOS salvo la
// constante STRIPE_MODE. Fuente de verdad: supabase/functions/stripe-checkout/index.ts
// (con helpers de _shared/ copiados inline). Ver docs/stripe-dashboard-functions/README.md.

import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_API_VERSION = "2026-06-24.dahlia";

// Candado de entorno: este archivo solo funciona con keys de Stripe del
// modo indicado. Evita cobrar dinero real desde el proyecto de pruebas, o
// usar una key de test en produccion por error.
const STRIPE_MODE = "live";

function stripeKeyMatchesMode(key) {
  return key.startsWith(`sk_${STRIPE_MODE}_`) || key.startsWith(`rk_${STRIPE_MODE}_`);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

function logError(event, error, data = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event, error: message, ...data, at: new Date().toISOString() }));
}

function isValidBody(body) {
  return typeof body === "object" && body !== null && typeof body.enrollmentId === "string";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Falta autenticacion", 401);
  }

  let body;
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

  if (!stripeKeyMatchesMode(stripeSecretKey)) {
    logError("stripe-checkout.modo_incorrecto", new Error(`STRIPE_SECRET_KEY no es de modo ${STRIPE_MODE}`));
    return errorResponse("Configuracion de Stripe incorrecta para este entorno", 500);
  }

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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: tuitionPeriod } = await supabaseAdmin
    .from("academy_tuition_periods")
    .select("amount_cents")
    .eq("group_id", enrollment.group_id)
    .eq("active", true)
    .maybeSingle();

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

  const lineItems = [];
  const sessionParams = {
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: { enrollment_id: enrollment.id },
    success_url: `${origin}/profile?pago=procesando`,
    cancel_url: `${origin}/academy?pago=cancelado`,
    mode: "payment",
  };

  const tuitionCents = tuitionPeriod?.amount_cents;
  if (tuitionCents && tuitionCents > 0) {
    // Grupo con colegiatura: se cobra SOLO la mensualidad, sin la cuota de
    // inscripcion por separado.
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
      billing_cycle_anchor_config: { day_of_month: 10 },
    };
  } else {
    // Sin colegiatura: cobro unico de la cuota de inscripcion, como antes.
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
