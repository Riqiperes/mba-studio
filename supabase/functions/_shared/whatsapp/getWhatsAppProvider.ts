import type { WhatsAppProvider } from "./types.ts";
import { MockWhatsAppProvider } from "./MockWhatsAppProvider.ts";

// Seleccion por variable de entorno (WHATSAPP_PROVIDER), nunca por codigo
// en la logica de negocio. Ver docs/whatsapp.md.
export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = Deno.env.get("WHATSAPP_PROVIDER") ?? "mock";

  switch (provider) {
    case "mock":
      return MockWhatsAppProvider;
    case "meta":
    case "twilio":
    case "ultramsg":
      // ponytail: proveedor real pendiente de decision de negocio
      // (docs/roadmap.md, "Decisiones pendientes"). Implementar cuando se
      // elija uno, siguiendo el mismo WhatsAppProvider.
      throw new Error(`WhatsApp provider "${provider}" aun no implementado`);
    default:
      throw new Error(`WhatsApp provider "${provider}" desconocido`);
  }
}
