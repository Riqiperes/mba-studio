// Crea una Stripe Checkout Session para la cuota de inscripcion de Academia.
// La llama apps/web (usuario autenticado). No otorga nada ni marca ningun
// pago: eso lo hace unicamente stripe-webhook cuando Stripe confirma el
// pago. Ver docs/payments.md.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";
import { logError } from "../_shared/logger.ts";

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
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !stripeSecretKey) {
    return errorResponse("Configuracion de servidor incompleta", 500);
  }

  // Cliente scoped al usuario que llama: respeta RLS, nunca vemos ni
  // tocamos inscripciones/alumnos ajenos.
  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: enrollment, error: fetchError } = await supabaseAsUser
    .from("academy_enrollments")
    .select("id, registration_fee_paid, business(academy_registration_fee_cents)")
    .eq("id", body.enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    return errorResponse("Solicitud de inscripcion no encontrada", 404);
  }

  if (enrollment.registration_fee_paid) {
    return errorResponse("La cuota de inscripcion ya esta pagada", 400);
  }

  const feeCents = enrollment.business?.academy_registration_fee_cents;
  if (!feeCents || feeCents <= 0) {
    return errorResponse("La cuota de inscripcion no esta configurada", 500);
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: { name: "Cuota de inscripcion - Academia" },
            unit_amount: feeCents,
          },
          quantity: 1,
        },
      ],
      metadata: { enrollment_id: enrollment.id },
      success_url: `${origin}/profile?pago=exitoso`,
      cancel_url: `${origin}/academy?pago=cancelado`,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    logError("stripe-checkout.session_create_failed", error, { enrollmentId: body.enrollmentId });
    return errorResponse("No se pudo iniciar el pago", 502);
  }
});
