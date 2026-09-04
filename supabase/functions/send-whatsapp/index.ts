// Envia un mensaje de WhatsApp via el WhatsAppProvider activo
// (WHATSAPP_PROVIDER). Funcion interna: solo la llaman otras Edge
// Functions (ej. notifications/) con la service role key, nunca el
// frontend. Ver docs/whatsapp.md.
import { handleCorsPreflight } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/responses.ts";
import { requireServiceRole } from "../_shared/internalAuth.ts";
import { logError } from "../_shared/logger.ts";
import { getWhatsAppProvider } from "../_shared/whatsapp/getWhatsAppProvider.ts";

interface SendWhatsAppBody {
  to: string;
  templateName: string;
  variables?: Record<string, string>;
}

function isValidBody(body: unknown): body is SendWhatsAppBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as SendWhatsAppBody).to === "string" &&
    typeof (body as SendWhatsAppBody).templateName === "string"
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
    return errorResponse("Se requiere { to: string, templateName: string, variables?: object }");
  }

  try {
    const provider = getWhatsAppProvider();
    const result = await provider.sendMessage({
      to: body.to,
      templateName: body.templateName,
      variables: body.variables ?? {},
    });
    return jsonResponse(result, result.success ? 200 : 502);
  } catch (error) {
    logError("send-whatsapp.failed", error, { templateName: body.templateName });
    const message = error instanceof Error ? error.message : "Error desconocido";
    return errorResponse(message, 500);
  }
});
