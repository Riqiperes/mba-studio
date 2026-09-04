import type { WhatsAppProvider } from "./types.ts";
import { logEvent } from "../logger.ts";

// Proveedor por defecto en desarrollo: no envia nada real, solo loguea.
// Ver docs/whatsapp.md.
export const MockWhatsAppProvider: WhatsAppProvider = {
  async sendMessage({ to, templateName, variables }) {
    logEvent("whatsapp.mock_send", { to, templateName, variables });
    return { success: true, providerMessageId: `mock-${Date.now()}` };
  },
};
