// Recibe los eventos de Stripe, verifica la firma con STRIPE_WEBHOOK_SECRET,
// y es la unica fuente de verdad para: 1) marcar la cuota de inscripcion
// de Academia como pagada y activar la inscripcion al instante si hay
// cupo (o reembolsar automaticamente si no), y 2) registrar cada cobro
// mensual de colegiatura (o su fallo) en academy_payments. Idempotente:
// un evento repetido nunca vuelve a marcar nada (tabla stripe_events). Ver
// docs/payments.md.
//
// Llamado directamente por Stripe (no por el frontend): no lleva JWT de
// Supabase, la autenticidad se verifica con la firma de Stripe. Por eso
// esta funcion se despliega con verify_jwt = false (supabase/config.toml).
import Stripe from "npm:stripe@22.6.2";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { logError, logEvent } from "../_shared/logger.ts";

const STRIPE_API_VERSION = "2026-06-24.dahlia" as const;

// Colegiatura vence el dia 10 de cada mes (docs/business-rules.md): el
// periodo de un mes dado va del 10 al ultimo dia de ese mismo mes. Mismo
// calculo que apps/admin/.../MarkPaymentModal.tsx (periodForMonth) -- se
// duplica aqui porque corre en un runtime distinto (Deno edge function),
// no porque el calculo cambie.
function periodForYearMonth(yearMonth: string): { periodStart: string; periodEnd: string } {
  const [year, month] = yearMonth.split("-").map(Number) as [number, number];
  const periodStart = `${yearMonth}-10`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart, periodEnd };
}

function yearMonthFromUnixSeconds(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * El pago se confirmo pero ya no hay cupo (o el alumno no cumple la edad
 * del grupo): reembolsa el cobro inicial, cancela la suscripcion si se
 * alcanzo a crear, y marca la solicitud como RECHAZADA.
 */
async function rejectAndRefund(
  stripe: Stripe,
  supabase: SupabaseClient,
  params: { enrollmentId: string; paymentIntentId: string | null; subscriptionId: string | null },
): Promise<void> {
  const { enrollmentId, paymentIntentId, subscriptionId } = params;

  try {
    if (paymentIntentId) {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    }
    if (subscriptionId) {
      await stripe.subscriptions.cancel(subscriptionId);
    }
  } catch (refundError) {
    // El dinero pudo NO haberse reembolsado si esto fallo (ej. problema de
    // red con Stripe) -- se deja constancia clara en logs para que el
    // staff lo revise a mano; de cualquier forma se marca RECHAZADA abajo
    // para que la solicitud no quede activa sin cupo real.
    logError("stripe-webhook.refund_failed", refundError, { enrollmentId, paymentIntentId, subscriptionId });
  }

  const { error: rejectError } = await supabase
    .from("academy_enrollments")
    .update({
      status: "RECHAZADA",
      registration_fee_paid: false,
      registration_fee_refunded_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  if (rejectError) {
    logError("stripe-webhook.reject_update_failed", rejectError, { enrollmentId });
  } else {
    logEvent("stripe-webhook.rechazada_por_cupo_reembolsada", { enrollmentId });
  }
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const enrollmentId = session.metadata?.enrollment_id;
  if (!enrollmentId) {
    logError(
      "stripe-webhook.sin_enrollment_id",
      new Error("checkout.session.completed sin metadata.enrollment_id"),
      { sessionId: session.id },
    );
    return;
  }

  let paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (subscriptionId && !paymentIntentId) {
    // Modo subscription: el pago inicial vive en la primera factura de la
    // suscripcion, no en session.payment_intent.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
    const latestInvoice = subscription.latest_invoice;
    if (latestInvoice && typeof latestInvoice !== "string" && latestInvoice.payment_intent) {
      paymentIntentId =
        typeof latestInvoice.payment_intent === "string"
          ? latestInvoice.payment_intent
          : latestInvoice.payment_intent.id;
    }
  }

  const { error: paidUpdateError } = await supabase
    .from("academy_enrollments")
    .update({
      registration_fee_paid: true,
      registration_fee_paid_at: new Date().toISOString(),
      registration_fee_stripe_session_id: session.id,
      registration_fee_stripe_payment_intent_id: paymentIntentId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
    })
    .eq("id", enrollmentId)
    .eq("registration_fee_paid", false);

  if (paidUpdateError) {
    logError("stripe-webhook.update_enrollment_fallo", paidUpdateError, { enrollmentId });
    return;
  }

  // Intenta activar de inmediato -- el trigger
  // enforce_academy_enrollment_capacity_and_age (migracion 023) valida
  // cupo y edad, y lanza una excepcion si no se puede activar.
  const { data: activated, error: activateError } = await supabase
    .from("academy_enrollments")
    .update({ status: "ACTIVA", updated_at: new Date().toISOString() })
    .eq("id", enrollmentId)
    .eq("status", "PENDIENTE")
    .select("id");

  if (activateError) {
    logEvent("stripe-webhook.sin_cupo_o_edad_invalida", { enrollmentId, motivo: activateError.message });
    await rejectAndRefund(stripe, supabase, { enrollmentId, paymentIntentId, subscriptionId });
    return;
  }

  if (!activated || activated.length === 0) {
    // El estado ya no era PENDIENTE (ej. staff ya la habia procesado a
    // mano). No es un error, solo no hay nada que activar.
    logEvent("stripe-webhook.activacion_omitida_no_pendiente", { enrollmentId });
    return;
  }

  logEvent("stripe-webhook.cuota_inscripcion_pagada_y_activada", { enrollmentId });
}

async function handleInvoiceEvent(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  status: "PAGADO" | "NO_PAGADO",
): Promise<void> {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subscriptionId) {
    // Factura sin suscripcion (no deberia pasar para colegiatura, pero no
    // hay nada que hacer aqui si ocurre).
    return;
  }

  const { data: enrollment, error: lookupError } = await supabase
    .from("academy_enrollments")
    .select("id, business_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (lookupError || !enrollment) {
    logError(
      "stripe-webhook.invoice_sin_enrollment",
      lookupError ?? new Error("sin inscripcion con esta suscripcion"),
      { subscriptionId, invoiceId: invoice.id },
    );
    return;
  }

  const yearMonth = yearMonthFromUnixSeconds(invoice.period_start);
  const { periodStart, periodEnd } = periodForYearMonth(yearMonth);

  const { error: upsertError } = await supabase.from("academy_payments").upsert(
    {
      business_id: enrollment.business_id,
      enrollment_id: enrollment.id,
      period_start: periodStart,
      period_end: periodEnd,
      status,
      amount_cents: status === "PAGADO" ? invoice.amount_paid : invoice.amount_due,
      paid_at: status === "PAGADO" ? new Date().toISOString() : null,
      payment_method: "STRIPE",
      reference: invoice.id,
    },
    { onConflict: "enrollment_id,period_start" },
  );

  if (upsertError) {
    logError("stripe-webhook.invoice_upsert_fallo", upsertError, { enrollmentId: enrollment.id, invoiceId: invoice.id });
    return;
  }

  logEvent(
    status === "PAGADO" ? "stripe-webhook.colegiatura_pagada" : "stripe-webhook.colegiatura_pago_fallido",
    { enrollmentId: enrollment.id, invoiceId: invoice.id },
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    logError("stripe-webhook.config_incompleta", new Error("faltan variables de entorno"));
    return new Response("Configuracion de servidor incompleta", { status: 500 });
  }

  const signature = req.headers.get("Stripe-Signature");
  const payload = await req.text();

  const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Falta el header Stripe-Signature");
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    logError("stripe-webhook.firma_invalida", error);
    return new Response("Firma invalida", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Idempotencia: si ya procesamos este event.id, no volver a tocar nada.
  const { error: insertError } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (insertError) {
    if (insertError.code === "23505") {
      logEvent("stripe-webhook.evento_duplicado_ignorado", { eventId: event.id, type: event.type });
      return new Response("ok", { status: 200 });
    }
    logError("stripe-webhook.stripe_events_insert_fallo", insertError, { eventId: event.id });
    return new Response("Error interno", { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(stripe, supabase, event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "invoice.paid") {
      await handleInvoiceEvent(supabase, event.data.object as Stripe.Invoice, "PAGADO");
    } else if (event.type === "invoice.payment_failed") {
      await handleInvoiceEvent(supabase, event.data.object as Stripe.Invoice, "NO_PAGADO");
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    logError("stripe-webhook.procesamiento_fallo", error, { eventId: event.id, type: event.type });
    return new Response("Error interno", { status: 500 });
  }
});
