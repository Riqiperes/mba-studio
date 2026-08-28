# WhatsApp

## Principio

WhatsApp esta completamente desacoplado del resto del sistema detras de una
interfaz `NotificationProvider` (nombre conceptual; el codigo real puede
llamarla `WhatsAppProvider`). La aplicacion nunca tiene logica especifica
de Meta, Twilio o UltraMsg repartida por el proyecto: solo conoce la
interfaz.

## Proveedores previstos

- `MockWhatsAppProvider` — no envia nada real, solo loguea. Proveedor por
  defecto en desarrollo.
- `MetaWhatsAppProvider` — Meta Cloud API.
- `TwilioWhatsAppProvider` — Twilio WhatsApp API.
- `UltraMsgWhatsAppProvider` — UltraMsg.

## Seleccion por configuracion

```
WHATSAPP_PROVIDER=mock
```

y en produccion, por ejemplo:

```
WHATSAPP_PROVIDER=meta
```

El cambio de proveedor es una variable de entorno (secret de Supabase Edge
Functions), nunca un cambio de codigo en la logica de negocio.

## Interfaz conceptual

```ts
interface WhatsAppProvider {
  sendMessage(params: {
    to: string; // numero en formato E.164
    templateName: string;
    variables: Record<string, string>;
  }): Promise<{ success: boolean; providerMessageId?: string; error?: string }>;
}
```

(Definicion exacta a afinar cuando se implemente — ver
`supabase/functions/send-whatsapp/README.md`.)

## Estado actual

No implementado todavia. Carpeta `supabase/functions/send-whatsapp/`
preparada. Se implementa en la etapa "WhatsApp" del roadmap, despues de
tener Notifications funcionando con el `MockWhatsAppProvider`.
