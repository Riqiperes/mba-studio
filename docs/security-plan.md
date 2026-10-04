# Plan de seguridad y continuidad

Plan vivo para que el estudio pueda operar tranquilo: que proteger, que ya
esta hecho, que falta (por prioridad) y que hacer si algo sale mal. Las
reglas permanentes (RLS, secretos, roles) siguen en `docs/security.md`;
este archivo es el plan de accion. Marcar cada punto al terminarlo.

## 1. Que protegemos

| Activo | Donde vive | Peor caso |
|---|---|---|
| Datos personales (nombre, telefono, correo, condiciones medicas, menores) | Supabase Postgres | Fuga de datos (LFPDPPP), daño reputacional |
| Creditos, reservaciones, pagos de academia | Supabase Postgres | Manipulacion de saldos o pagos |
| Cuentas de admin (`BUSINESS_ADMIN`, `SUPER_ADMIN`) | Supabase Auth | Alguien con control total del panel |
| Llaves (service role, Stripe, Resend) | Secrets de Edge Functions / dashboards | Acceso total a la base o a cobros |
| Disponibilidad de web y panel | Cloudflare Pages + Supabase | Clientes sin poder reservar |

## 2. Lo que ya esta cubierto

- RLS en toda tabla de negocio; RPCs `security definer` revisadas con el
  checklist de `docs/security.md`.
- Ningun secreto en el frontend: solo `VITE_SUPABASE_URL` y la anon key,
  que son publicas por diseño.
- React escapa todo el texto que pinta; no hay `dangerouslySetInnerHTML`
  en ninguna app (mantenerlo asi).
- Pagos solo se confirman por webhook firmado e idempotente (`docs/payments.md`).
- HTTPS obligatorio y proteccion DDoS basica: incluidos en Cloudflare Pages.
- Headers de seguridad en `apps/*/public/_headers` (2026-10-04): HSTS,
  `nosniff`, `X-Frame-Options: DENY` (nadie puede meter el panel en un
  iframe para engañar clics), `Referrer-Policy` y `Permissions-Policy`.

## 3. Navegador: cookies y almacenamiento

- **La sesion no usa cookies**: Supabase guarda el token en `localStorage`.
  Consecuencia: la defensa principal es evitar XSS (si un atacante ejecuta
  JS en nuestra pagina, puede leer el token). Por eso importan la CSP
  (fase 2) y no meter HTML sin escapar.
- Cookies de terceros: Google Maps (iframe del inicio), Google Fonts y
  Cloudflare (`__cf_bm`, anti-bots). Son tecnicas/funcionales. En Mexico
  (LFPDPPP) lo que se exige es mencionarlas en el **aviso de privacidad**,
  no un banner tipo Europa. Incluirlas cuando se redacten los textos
  legales (`docs/roadmap.md`).
- `localStorage` tambien guarda la preferencia de tema (`mba-theme`). Nada
  sensible.
- Cerrar sesion borra el token local. En dispositivos compartidos del
  estudio, siempre cerrar sesion del panel.

## 4. Pendientes por prioridad

### Fase 1 — ya (configuracion, sin codigo)

- [ ] **MFA (2 pasos) para todas las cuentas admin** de Supabase, Cloudflare,
  GitHub, Stripe, Resend, GoDaddy y Google. Son las llaves del reino.
- [ ] Supabase Auth > "Leaked password protection" activado (rechaza
  contraseñas filtradas conocidas). Revisar `get_advisors` de seguridad en
  dev y prod y resolver lo que marque.
- [ ] Supabase Auth > Rate limits: revisar los limites de registro, login y
  correos (evita spam de registros y abuso del SMTP de Resend).
- [ ] Confirmar el plan de Supabase de produccion y si incluye **backups
  diarios**. Si es plan gratis: no hay backups descargables, ver fase 2.
- [ ] Lista de quien tiene acceso a que (sección 6) y quitar accesos que ya
  no se usan.
- [ ] GitHub: activar Dependabot alerts y secret scanning en el repo.

### Fase 2 — proximas semanas

- [ ] **Respaldo propio semanal**: `pg_dump` de produccion guardado fuera de
  Supabase (Drive cifrado o similar). Probar restaurarlo en dev una vez.
- [ ] **CSP** (Content-Security-Policy) en `_headers`, primero en modo
  `Report-Only`. Origenes a permitir: el propio sitio, `*.supabase.co`
  (API y websockets), `fonts.googleapis.com`/`fonts.gstatic.com`,
  `www.google.com` (iframe del mapa) y Stripe cuando entre. El script
  inline del tema en `index.html` necesita su hash o moverse a archivo.
- [ ] **Cloudflare Turnstile** (CAPTCHA invisible, gratis) en registro y
  "olvide mi contraseña", integrado con Supabase Auth (Attack Protection).
- [ ] Monitoreo de caidas: un check gratuito (UptimeRobot o similar) a la
  web y al panel con aviso por correo/WhatsApp.
- [ ] Aceptacion de terminos registrada en servidor (tabla de solo
  insercion con fecha del servidor). Ver `docs/roadmap.md`.

### Fase 3 — antes de crecer (white-label / mas negocios)

- [ ] Revision de seguridad externa o pentest ligero.
- [ ] Logs de auditoria de acciones admin (quien cancelo/borro que).
- [ ] Panel en dominio propio con Cloudflare Access (solo correos del
  equipo pueden siquiera abrir la pagina del panel).

## 5. Plan de respuesta a incidentes

Regla general: **primero contener, luego investigar, luego avisar, al final
corregir y documentar** (agregar el caso a `docs/CURRENT_STATE.md`).

### Web o panel caidos

1. Revisar status: https://www.cloudflarestatus.com y https://status.supabase.com.
2. Si es Cloudflare o Supabase: no hay nada que arreglar de nuestro lado;
   avisar a clientes por WhatsApp/Instagram que las reservaciones se toman
   por WhatsApp mientras vuelve.
3. Si solo falla lo nuestro: en Cloudflare Pages > Deployments, hacer
   **Rollback** al ultimo deploy que funcionaba (un clic). Luego revisar
   que commit lo rompio.

### Cuenta admin comprometida (alguien entro con la cuenta de otro)

1. En Supabase Auth: cerrar sesiones de ese usuario y cambiar su contraseña;
   si hace falta, quitarle el rol en `profiles` desde el dashboard.
2. Revisar que cambio (creditos, clases, pagos) con las tablas de ledger.
3. Activar MFA en esa cuenta antes de devolverla.

### Fuga de una llave (service role, Stripe, Resend)

1. Rotarla de inmediato en su dashboard (Supabase > API keys, Stripe >
   Developers, Resend > API keys).
2. Actualizar el secret en Supabase Edge Functions.
3. Si fue la service role: revisar logs de Supabase de esas fechas.
4. Si fue por un commit: rotar no basta con borrar el commit; la llave vieja
   se considera publica para siempre.

### Datos borrados o corrompidos

1. No seguir escribiendo encima: pausar la operacion afectada.
2. Restaurar desde el backup de Supabase (si el plan lo tiene) o desde el
   `pg_dump` propio, primero en dev para verificar.

### Spam / ataque de registros o de correos

1. Bajar rate limits de Auth en Supabase y activar Turnstile (fase 2).
2. En Cloudflare: activar "Under Attack mode" temporalmente.
3. Borrar cuentas basura desde Supabase Auth.

### Fuga de datos personales

1. Contener (rotar llaves, cerrar el hueco).
2. Determinar que datos y de cuantas personas.
3. La LFPDPPP pide **informar a los titulares afectados** sin demora cuando
   la fuga afecta sus derechos. Consultar con un abogado antes del aviso.

## 6. Accesos y contactos

Mantener esta tabla al dia (sin contraseñas, solo quien tiene acceso):

| Servicio | Quien tiene acceso | MFA |
|---|---|---|
| Supabase (dev y prod) | | |
| Cloudflare | | |
| GitHub | | |
| Stripe | | |
| Resend | | |
| GoDaddy (dominio) | | |
| Google Cloud (OAuth) | | |
