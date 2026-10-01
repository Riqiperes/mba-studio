# Checklist: activar colegiatura recurrente + activacion automatica

Lista de pasos pendientes para que el codigo de
`feat/academy-registration-stripe-checkout` (colegiatura mensual por
Stripe + activacion automatica de inscripciones) funcione en modo test.
Incluye el codigo completo de las 3 funciones listo para copiar/pegar
(igual al de `docs/stripe-test-deploy.md` -- si se vuelve a editar la
logica, actualizar ambos archivos).

Nada de esto se aplica solo -- cada paso lo corre el usuario a mano en el
Dashboard de Supabase o de Stripe. Marca cada casilla conforme lo hagas.

## Estado

- [x] Migracion `031_academy_tuition_stripe_auto_activation.sql` aplicada
      en Supabase (SQL Editor).
- [ ] **Re-pegar** `stripe-checkout` en el Dashboard -- el codigo de abajo
      cambio el 2026-10-01 (ya no cobra la cuota de inscripcion junto con
      la colegiatura, solo la mensualidad). La version que ya pegaste
      antes esta desactualizada.
- [x] Codigo de `stripe-webhook` pegado en el Dashboard.
- [x] Funcion `stripe-cancel-subscription` creada y desplegada.
- [ ] `stripe-webhook`: confirmar que "Enforce JWT Verification" sigue
      **desactivado**.
- [ ] `stripe-checkout` y `stripe-cancel-subscription`: confirmar JWT
      verification **activado** (default, no tocar).
- [x] Fila de colegiatura ($900 MXN) creada en `academy_tuition_periods`
      para "Ballet Infantil A".
- [ ] Webhook de Stripe (test mode) actualizado con los eventos
      `invoice.paid` e `invoice.payment_failed` (ademas del
      `checkout.session.completed` que ya tenia).
- [ ] Prueba de pago repetida con tarjeta de test, confirmando que ahora
      cobra solo $900 (sin los $250 de inscripcion) para grupos con
      colegiatura.
- [ ] En Stripe Dashboard -> Settings -> Business -> Public details:
      cambiar el nombre publico de "BRANSH" al del negocio real (y
      confirmar que esa cuenta de Stripe es la correcta antes de ir a
      produccion).
- [ ] PR abierto contra `develop` (pendiente, no se abre sin avisar).

## Paso 2 -- Desplegar las funciones

### 2.1. `stripe-checkout` (ya existe -- editar y reemplazar todo)

Dashboard de Supabase -> **Edge Functions** -> `stripe-checkout` -> editar
-> borrar todo el contenido -> pegar esto -> Deploy:

```typescript
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_API_VERSION = "2026-06-24.dahlia";

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
      billing_cycle_anchor_config: { day_of_month: 1 },
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
```

### 2.2. `stripe-webhook` (ya existe -- editar y reemplazar todo)

Mismo proceso en `stripe-webhook` -> pegar esto -> Deploy:

```typescript
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_API_VERSION = "2026-06-24.dahlia";

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
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
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
    return new Response("Error interno", { status: 500 });
  }
});
```

### 2.3. `stripe-cancel-subscription` (nueva -- "Deploy a new function")

Nombre exacto: `stripe-cancel-subscription`. Pegar esto -> Deploy:

```typescript
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_API_VERSION = "2026-06-24.dahlia";

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
```

## Paso 3 -- Configuracion

1. **JWT verification**: confirmar que sigue desactivado solo en
   `stripe-webhook` (Stripe no manda JWT de Supabase, autentica con su
   propia firma). No tocar `stripe-checkout` ni `stripe-cancel-subscription`.

2. **Colegiatura del grupo de Ballet** (SQL Editor de Supabase). Primero
   confirma el nombre exacto del grupo:
   ```sql
   select name from public.academy_groups;
   ```
   Despues, ajustando `g.name` al nombre real (visto antes:
   `'Ballet Infantil A'`):
   ```sql
   insert into public.academy_tuition_periods (business_id, group_id, amount_cents, active)
   select b.id, g.id, 90000, true
   from public.business b
   join public.academy_groups g on g.business_id = b.id
   where b.name = 'MBA MID' and g.name = 'Ballet Infantil A'
   on conflict (group_id) do update set amount_cents = excluded.amount_cents, active = true;
   ```
   (90000 centavos = $900.00 MXN/mes). Repite el `insert` cambiando
   `g.name` por cada grupo adicional de Ballet que tambien cobre
   colegiatura.

3. **Webhook de Stripe** (test mode):
   [dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
   -> abrir el endpoint ya creado -> editar -> agregar estos dos eventos
   (sin quitar el que ya tenia):
   - `invoice.paid`
   - `invoice.payment_failed`
   No hace falta generar un `whsec_...` nuevo por esto -- agregar eventos a
   un endpoint existente no lo regenera.

## Paso 4 -- Probar

Ver la seccion "Probar el pago" de `docs/stripe-test-deploy.md` (tarjeta
`4242 4242 4242 4242`, como forzar el caso sin cupo, como adelantar el
reloj de una suscripcion en Stripe test mode para simular el cobro del
mes siguiente).
