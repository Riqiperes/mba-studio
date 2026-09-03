# supabase/functions/_shared

Codigo compartido entre Edge Functions:

- `cors.ts` / `responses.ts` - CORS y formato consistente de respuestas.
- `logger.ts` - logging estructurado, nunca imprime secretos.
- `internalAuth.ts` - `requireServiceRole()`, exige que el caller mande la
  service role key (estas funciones son server-to-server, no frontend).
- `whatsapp/types.ts` - interfaz `WhatsAppProvider`.
- `whatsapp/MockWhatsAppProvider.ts` - provider por defecto en desarrollo.
- `whatsapp/getWhatsAppProvider.ts` - selecciona provider por
  `WHATSAPP_PROVIDER`.

Pendiente (cuando se implemente Stripe/email): `supabaseAdmin.ts`,
`stripe.ts`, `validators.ts` con Zod.
