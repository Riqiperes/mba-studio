// Recibe los eventos de Stripe, verifica la firma con STRIPE_WEBHOOK_SECRET,
// y es la unica fuente de verdad para marcar la cuota de inscripcion de
// Academia como pagada. Idempotente: un evento repetido nunca vuelve a
// marcar nada (tabla stripe_events). Ver docs/payments.md.
//
// Llamado directamente por Stripe (no por el frontend): no lleva JWT de
// Supabase, la autenticidad se verifica con la firma de Stripe. Por eso
// esta funcion se despliega con verify_jwt = false (supabase/config.toml).
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logError, logEvent } from "../_shared/logger.ts";

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

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

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
      const session = event.data.object as Stripe.Checkout.Session;
      const enrollmentId = session.metadata?.enrollment_id;

      if (!enrollmentId) {
        logError(
          "stripe-webhook.sin_enrollment_id",
          new Error("checkout.session.completed sin metadata.enrollment_id"),
          { eventId: event.id, sessionId: session.id },
        );
        return new Response("ok", { status: 200 });
      }

      const { error: updateError } = await supabase
        .from("academy_enrollments")
        .update({
          registration_fee_paid: true,
          registration_fee_paid_at: new Date().toISOString(),
          registration_fee_stripe_session_id: session.id,
        })
        .eq("id", enrollmentId)
        .eq("registration_fee_paid", false);

      if (updateError) {
        logError("stripe-webhook.update_enrollment_fallo", updateError, { eventId: event.id, enrollmentId });
        return new Response("Error interno", { status: 500 });
      }

      logEvent("stripe-webhook.cuota_inscripcion_pagada", { eventId: event.id, enrollmentId });
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    logError("stripe-webhook.procesamiento_fallo", error, { eventId: event.id, type: event.type });
    return new Response("Error interno", { status: 500 });
  }
});
