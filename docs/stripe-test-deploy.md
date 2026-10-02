# Stripe test mode - despliegue via Dashboard y prueba de pago

> **Codigo actualizado el 2026-10-02:** los bloques de codigo de este
> archivo quedaron desactualizados (version de API de Stripe, lectura de
> `invoice.parent.subscription_details` / `invoice.payments`, reintentos del
> webhook y chequeo de rol en `stripe-cancel-subscription`). Para desplegar,
> copia siempre el codigo de `supabase/functions/<funcion>/index.ts`, que
> es la fuente de verdad.

Guia de referencia para (re)desplegar `stripe-checkout`, `stripe-webhook`
y `stripe-cancel-subscription` desde el Dashboard web de Supabase (sin
CLI) y probar el cobro de la cuota de inscripcion + colegiatura mensual de
Academia en modo test. Ver `docs/payments.md` para el diseño completo.

**El codigo de las 3 funciones cambio sustancialmente el 2026-09-28**
(colegiatura recurrente, activacion automatica, reembolso automatico) --
si ya habias pegado una version anterior en el Dashboard, hay que
reemplazarla completa por la de abajo, no solo agregar lo nuevo.

## Por que estas versiones son distintas al repo

El codigo fuente real vive en `supabase/functions/stripe-checkout/index.ts`,
`supabase/functions/stripe-webhook/index.ts` y
`supabase/functions/stripe-cancel-subscription/index.ts`, y reutiliza
helpers compartidos de `supabase/functions/_shared/` (cors, responses,
logger). El editor de funciones del Dashboard no tiene acceso al resto del
repo, asi que estas versiones de abajo traen esos helpers **inline**
(duplicados) para poder pegarse solas.

**Quedan desincronizadas del repo a proposito.** Si se edita la logica de
alguna funcion, hay que actualizar ambos lados a mano (el `.ts` del repo y
lo pegado en el Dashboard), o migrar a `supabase functions deploy` via CLI
para que el repo vuelva a ser la unica fuente de verdad.

## Pasos previos (una sola vez)

1. Monto de la cuota de inscripcion (SQL Editor de Supabase), si no se
   hizo ya:
   ```sql
   update public.business
   set academy_registration_fee_cents = 25000
   where name = 'MBA MID';
   ```
   (25000 centavos = $250.00 MXN)
2. **Nuevo**: colegiatura mensual de los grupos de Ballet ($900 MXN). Cada
   grupo con colegiatura necesita su propia fila en
   `academy_tuition_periods` (grupos sin fila activa aqui NO cobran
   colegiatura, solo la cuota de inscripcion -- ver `docs/payments.md`).
   Ajusta el nombre del grupo segun corresponda:
   ```sql
   insert into public.academy_tuition_periods (business_id, group_id, amount_cents, active)
   select b.id, g.id, 90000, true
   from public.business b
   join public.academy_groups g on g.business_id = b.id
   where b.name = 'MBA MID' and g.name = 'Ballet Infantil A'
   on conflict (group_id) do update set amount_cents = excluded.amount_cents, active = true;
   ```
   (90000 centavos = $900.00 MXN/mes). Repite el `insert` para cada grupo
   de Ballet adicional, cambiando `g.name`.
3. Secret `STRIPE_SECRET_KEY` cargado en Project Settings -> Edge
   Functions -> Secrets (la `sk_test_...`, nunca la `sk_live_...`).
4. Desplegar las 3 funciones (Dashboard -> Edge Functions -> Deploy a new
   function, o editar las existentes), pegando el codigo de las secciones
   de abajo.
5. Solo para `stripe-webhook`: en su pagina de configuracion, apagar
   **"Enforce JWT Verification"** (Stripe llama a esta funcion sin JWT de
   Supabase, autentica con su propia firma). `stripe-checkout` y
   `stripe-cancel-subscription` se dejan con JWT activado (las llaman
   apps/web y apps/admin con la sesion del usuario).
6. Webhook endpoint en
   [Stripe Dashboard (test mode)](https://dashboard.stripe.com/test/webhooks):
   URL `https://eazyblybekyygimqpjjw.supabase.co/functions/v1/stripe-webhook`.
   **Eventos a escuchar** (si el endpoint ya existia solo con
   `checkout.session.completed`, edítalo para agregar los otros dos):
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   Copiar el "Signing secret" (`whsec_...`) y cargarlo como secret
   `STRIPE_WEBHOOK_SECRET` (mismo lugar que el paso 3).

## Funcion 1: `stripe-checkout`

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

## Funcion 2: `stripe-webhook`

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

## Funcion 3 (nueva): `stripe-cancel-subscription`

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

## Probar el pago

1. Login real en `apps/web` (`http://localhost:5173` en desarrollo).
2. Ir a `/academy` -> elegir un grupo de Ballet (con colegiatura
   configurada) -> **"Pagar inscripción e inscribir"** -> completar el
   modal (alumno + fecha de nacimiento si es nuevo).
3. Redirige a Stripe Checkout hosted, mostrando **dos conceptos**: la
   cuota de inscripción y la colegiatura (prorateada hasta el día 1). Usar
   la **tarjeta de prueba**:
   - Numero: `4242 4242 4242 4242`
   - Fecha de expiracion: cualquier fecha futura (ej. `12/34`)
   - CVC: cualquier 3 digitos
   - Nombre/codigo postal: cualquier valor
4. Al completar el pago, Stripe redirige a `/profile?pago=procesando`. En
   unos segundos, si había cupo, la solicitud debe verse `ACTIVA`
   directamente en "Mis alumnos e inscripciones" (sin pasar por
   `apps/admin`). Si el grupo ya no tenía cupo, debe verse `RECHAZADA` y
   el cargo debe aparecer reembolsado en el
   [Dashboard de Stripe (test mode) -> Payments](https://dashboard.stripe.com/test/payments).
5. Para probar el caso sin cupo: baja `max_capacity` del grupo a un número
   ya alcanzado (o llena el grupo con alumnos `ACTIVA` de prueba) antes de
   pagar.
6. Para probar el cobro mensual sin esperar un mes real: en el
   [Dashboard de Stripe (test mode) -> Subscriptions](https://dashboard.stripe.com/test/subscriptions),
   abre la suscripción creada y usa **"Advance clock"** (o edita la
   suscripción para que el próximo ciclo de facturación sea hoy) para
   forzar un nuevo `invoice.paid` y confirmar que se registra en
   `academy_payments` con `payment_method = 'STRIPE'`.
7. Si algo falla: revisar los logs de la función correspondiente en el
   Dashboard (Edge Functions -> `<nombre>` -> Logs) -- ahí quedan los
   `console.error` con el detalle.

**Nunca usar una tarjeta real ni la `sk_live_...`/`pk_live_...` para estas
pruebas** -- con claves de test, Stripe rechaza tarjetas reales y con
claves live cualquier pago es un cobro de verdad.
