// stripe-webhook -- version TEST para pegar en el Dashboard de Supabase.
//
// Proyecto: MBA-STUDIO (eazyblybekyygimqpjjw) -- desarrollo
// Secrets esperados: sk_test_... / rk_test_... y el whsec_ del webhook de TEST mode
// JWT verification: DESACTIVADA (Stripe no manda JWT, se valida la firma)
//
// Este archivo y su gemelo (stripe-webhook.production.ts) son IDENTICOS salvo la
// constante STRIPE_MODE. Fuente de verdad: supabase/functions/stripe-webhook/index.ts
// (con helpers de _shared/ copiados inline). Ver docs/stripe-dashboard-functions/README.md.

import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_API_VERSION = "2026-06-24.dahlia";

// Candado de entorno: este archivo solo funciona con keys de Stripe del
// modo indicado. Evita cobrar dinero real desde el proyecto de pruebas, o
// usar una key de test en produccion por error.
const STRIPE_MODE = "test";

function stripeKeyMatchesMode(key) {
  return key.startsWith(`sk_${STRIPE_MODE}_`) || key.startsWith(`rk_${STRIPE_MODE}_`);
}

function logEvent(event, data = {}) {
  console.log(JSON.stringify({ event, ...data, at: new Date().toISOString() }));
}

function logError(event, error, data = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event, error: message, ...data, at: new Date().toISOString() }));
}

function periodForYearMonth(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  const periodStart = `${yearMonth}-10`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart, periodEnd };
}

function yearMonthFromUnixSeconds(unixSeconds) {
  const date = new Date(unixSeconds * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function rejectAndRefund(stripe, supabase, { enrollmentId, paymentIntentId, subscriptionId }) {
  try {
    if (paymentIntentId) {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    }
    if (subscriptionId) {
      await stripe.subscriptions.cancel(subscriptionId);
    }
  } catch (refundError) {
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

async function handleCheckoutSessionCompleted(stripe, supabase, session) {
  const enrollmentId = session.metadata?.enrollment_id;
  if (!enrollmentId) {
    logError("stripe-webhook.sin_enrollment_id", new Error("sin metadata.enrollment_id"), { sessionId: session.id });
    return;
  }

  let paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (subscriptionId && !paymentIntentId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payments"],
    });
    const latestInvoice = subscription.latest_invoice;
    const invoicePaymentIntent =
      latestInvoice && typeof latestInvoice !== "string"
        ? latestInvoice.payments?.data[0]?.payment.payment_intent
        : undefined;
    if (invoicePaymentIntent) {
      paymentIntentId =
        typeof invoicePaymentIntent === "string" ? invoicePaymentIntent : invoicePaymentIntent.id;
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
    logEvent("stripe-webhook.activacion_omitida_no_pendiente", { enrollmentId });
    return;
  }

  logEvent("stripe-webhook.cuota_inscripcion_pagada_y_activada", { enrollmentId });
}

async function handleInvoiceEvent(supabase, invoice, status) {
  const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id ?? null;
  if (!subscriptionId) return;

  const { data: enrollment, error: lookupError } = await supabase
    .from("academy_enrollments")
    .select("id, business_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (lookupError || !enrollment) {
    logError("stripe-webhook.invoice_sin_enrollment", lookupError ?? new Error("sin match"), {
      subscriptionId,
      invoiceId: invoice.id,
    });
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

  logEvent(status === "PAGADO" ? "stripe-webhook.colegiatura_pagada" : "stripe-webhook.colegiatura_pago_fallido", {
    enrollmentId: enrollment.id,
    invoiceId: invoice.id,
  });
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

  if (!stripeKeyMatchesMode(stripeSecretKey)) {
    logError("stripe-webhook.modo_incorrecto", new Error(`STRIPE_SECRET_KEY no es de modo ${STRIPE_MODE}`));
    return new Response("Configuracion de Stripe incorrecta para este entorno", { status: 500 });
  }

  const signature = req.headers.get("Stripe-Signature");
  const payload = await req.text();

  const stripe = new Stripe(stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

  let event;
  try {
    if (!signature) throw new Error("Falta el header Stripe-Signature");
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    logError("stripe-webhook.firma_invalida", error);
    return new Response("Firma invalida", { status: 400 });
  }

  if (event.livemode !== (STRIPE_MODE === "live")) {
    logError("stripe-webhook.evento_de_otro_modo", new Error("livemode no coincide"), { eventId: event.id });
    return new Response("Evento de otro modo de Stripe", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error: insertError } = await supabase.from("stripe_events").insert({ id: event.id, type: event.type });

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
      await handleCheckoutSessionCompleted(stripe, supabase, event.data.object);
    } else if (event.type === "invoice.paid") {
      await handleInvoiceEvent(supabase, event.data.object, "PAGADO");
    } else if (event.type === "invoice.payment_failed") {
      await handleInvoiceEvent(supabase, event.data.object, "NO_PAGADO");
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    logError("stripe-webhook.procesamiento_fallo", error, { eventId: event.id, type: event.type });
    await supabase.from("stripe_events").delete().eq("id", event.id);
    return new Response("Error interno", { status: 500 });
  }
});
