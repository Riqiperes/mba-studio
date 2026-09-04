# notifications

Edge Function que recibe un evento de negocio y lo despacha al canal
correspondiente. Funcion interna, requiere `Authorization: Bearer <service
role key>`. Body: `{ type, to, variables? }`, `type` uno de
`NOTIFICATION_TEMPLATES` (`templates.ts`). Solo WhatsApp implementado por
ahora (via `send-whatsapp/`); email pendiente. Ver `docs/notifications.md`.
