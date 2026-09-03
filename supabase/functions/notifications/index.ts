// Recibe un evento de negocio y lo despacha al canal correspondiente.
// Por ahora solo WhatsApp (via send-whatsapp/); email queda para cuando se
// implemente EmailProvider (docs/notifications.md). Funcion interna: solo
// la llaman otras Edge Functions o triggers, nunca el frontend.
import { handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";
import { requireServiceRole } from "../_shared/internalAuth.ts";
import { logError } from "../_shared/logger.ts";
import { isNotificationType, NOTIFICATION_TEMPLATES } from "./templates.ts";

interface NotificationBody {
  type: string;
  to: string;
  variables?: Record<string, string>;
}

function isValidBody(body: unknown): body is NotificationBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as NotificationBody).type === "string" &&
    typeof (body as NotificationBody).to === "string"
  );
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const authError = requireServiceRole(req);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body invalido, se esperaba JSON");
  }

  if (!isValidBody(body)) {
    return errorResponse("Se requiere { type: string, to: string, variables?: object }");
  }

  if (!isNotificationType(body.type)) {
    return errorResponse(`Tipo de notificacion desconocido: "${body.type}"`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse("Configuracion de servidor incompleta", 500);
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: body.to,
        templateName: NOTIFICATION_TEMPLATES[body.type],
        variables: body.variables ?? {},
      }),
    });
    const result = await response.json();
    return jsonResponse(result, response.status);
  } catch (error) {
    logError("notifications.dispatch_failed", error, { type: body.type });
    return errorResponse("No se pudo despachar la notificacion", 500);
  }
});
