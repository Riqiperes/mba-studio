# send-whatsapp

Edge Function que envia un mensaje de WhatsApp usando el `WhatsAppProvider`
activo, seleccionado por la variable de entorno `WHATSAPP_PROVIDER`
(`mock` implementado; `meta` | `twilio` | `ultramsg` lanzan error explicito
hasta que se decida el proveedor real). Funcion interna, requiere
`Authorization: Bearer <service role key>`. Body: `{ to, templateName,
variables? }`. Ver `docs/whatsapp.md`.
