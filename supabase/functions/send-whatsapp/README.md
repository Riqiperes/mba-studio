# send-whatsapp

Edge Function que envia un mensaje de WhatsApp usando el `WhatsAppProvider`
activo, seleccionado por la variable de entorno `WHATSAPP_PROVIDER`
(`mock` | `meta` | `twilio` | `ultramsg`). La logica de negocio nunca debe
conocer el proveedor concreto, solo la interfaz `NotificationProvider`. Ver
`docs/whatsapp.md`. Sin implementar todavia.
