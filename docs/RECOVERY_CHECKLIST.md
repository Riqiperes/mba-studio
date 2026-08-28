# Recovery Checklist

Version rapida de `docs/PROJECT_RECOVERY.md`. Usar esa guia para el detalle
de cada paso.

- [ ] Clone repository (`git clone https://github.com/Riqiperes/mba-studio.git`)
- [ ] Install Node.js `>= 20.19.0` (ver `.nvmrc`) y npm
- [ ] Install dependencies (`npm install` en la raiz)
- [ ] Configure `.env` (`cp .env.example apps/web/.env` y
      `cp .env.example apps/admin/.env`, llenar valores)
- [ ] Configure Supabase (crear/ubicar proyecto, copiar URL + anon key +
      service role key)
- [ ] Run migrations (`supabase link` + `supabase db push`)
- [ ] Configure Google OAuth (Google Cloud Console + dashboard de
      Supabase)
- [ ] Configure Stripe (API keys + secrets de Supabase)
- [ ] Configure webhooks (endpoint en Stripe + `STRIPE_WEBHOOK_SECRET`)
- [ ] Configure WhatsApp (proveedor real o dejar `mock`)
- [ ] Run tests (`npm run test`)
- [ ] Build (`npm run build`)
- [ ] Deploy (Cloudflare Pages x2 + Supabase produccion, ver
      `docs/deployment.md`)
- [ ] Verify production (checklist completo en
      `docs/PROJECT_RECOVERY.md`, seccion 17)
