// Interfaz conceptual documentada en docs/whatsapp.md. La logica de negocio
// (notifications/index.ts) nunca conoce Meta/Twilio/UltraMsg, solo esto.
export interface WhatsAppProvider {
  sendMessage(params: {
    to: string; // numero en formato E.164
    templateName: string;
    variables: Record<string, string>;
  }): Promise<{ success: boolean; providerMessageId?: string; error?: string }>;
}
