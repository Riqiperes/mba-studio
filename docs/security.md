# Seguridad

## Principios

1. Nunca confiar en el frontend para decisiones de autorizacion o de pago.
2. RLS (Row Level Security) obligatorio en toda tabla de Postgres. Nunca se
   desactiva para "solucionar" un bug: el bug se arregla ajustando la
   policy.
3. Los roles (`CUSTOMER`, `STAFF`, `BUSINESS_ADMIN`, `SUPER_ADMIN`) se
   verifican server-side (RLS y/o Edge Functions), nunca solo en el
   frontend.

## RLS — reglas por rol (a implementar junto con cada tabla)

- **Customer**: puede leer/modificar unicamente sus propios datos (su
  perfil, sus bookings, sus pagos, su inscripcion de academia). No puede
  leer datos de otro customer.
- **Business Admin / Staff**: puede administrar unicamente los datos cuyo
  `business_id` coincide con el negocio al que pertenece.
- **Super Admin**: puede administrar todos los negocios (rol preparado,
  sin UI todavia — ver `docs/white-label.md`).

La seguridad debe sostenerse aunque alguien llame directamente a la API de
Supabase con la anon key, sin pasar por la UI.

## Secretos

- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  credenciales de WhatsApp/email: solo como secrets de Supabase Edge
  Functions. Nunca en el frontend, nunca en variables `VITE_*`, nunca
  committeados.
- `.env`, `.env.local` y variantes estan en `.gitignore`. Solo
  `.env.example` (sin valores reales) se versiona.

## Validacion

Los datos se validan en frontend (UX) y en backend/Edge Function (verdad),
usando Zod donde aplique. Nunca se asume que un payload del frontend es
confiable, incluso si el frontend "ya valido".

## Manejo de errores

Errores claros, consistentes y seguros: nunca se expone informacion
sensible (stack traces, detalles de infraestructura, claves) al usuario
final. Categorias con tratamiento consistente: errores de API, de
validacion, de autenticacion, de pago, de reservacion.

## Logging

Logging estructurado. Nunca se registra: passwords, secret keys, tokens de
sesion/API, informacion financiera sensible (numeros de tarjeta, etc.).

## Checklist para toda funcion RPC `security definer` nueva o modificada

Cada RPC de escritura (`book_class`, `cancel_booking`, `promote_from_waitlist`,
`grant_credits`, `reset_monthly_credits`, y cualquier futura) debe cumplir
las 3 reglas de abajo. Se agregaron a este documento despues de encontrar
dos regresiones reales sobre este patron (ver `docs/CURRENT_STATE.md`,
"Known Issues" y migraciones `016`/`017`):

1. **Chequeo de autorizacion explicito al inicio de la funcion**, antes de
   tocar cualquier fila: o bien "el actor es dueno de la fila" (p.ej.
   `customer_id = auth.uid()` para una accion que un cliente hace sobre si
   mismo), o bien "el actor tiene rol STAFF/BUSINESS_ADMIN/SUPER_ADMIN Y
   pertenece al mismo `business_id`" (salvo `SUPER_ADMIN`, que ve todos los
   negocios). `current_user_role()` puede devolver `NULL` si el actor no
   tiene fila en `profiles`; comparar con `is null or ... not in (...)`, no
   con `not in (...)` a secas, para que el caso NULL bloquee (falle
   cerrado) en vez de dejar pasar por como Postgres evalua NULL en un IF.
2. **`revoke execute ... from public, anon, authenticated`** salvo que la
   funcion deba ser invocable directamente por clientes (en ese caso, solo
   `to authenticated`, nunca `to public`/`anon`). Postgres otorga EXECUTE a
   PUBLIC por defecto al crear una funcion, y el setup de Supabase ademas
   otorga a `anon`/`authenticated` via `ALTER DEFAULT PRIVILEGES` — sin el
   revoke explicito, cualquier cliente (incluso anonimo en las rutas
   publicas de `apps/web`) puede invocar la RPC via `supabase.rpc()` sin
   pasar por ninguna pantalla, y el unico limite real termina siendo el
   chequeo interno del punto 1.
3. **Verificar que ambas apps que llaman la RPC obtienen el resultado que
   necesitan** antes de dar por buena la funcion: `apps/web` (cliente actua
   sobre si mismo) y `apps/admin` (staff actua sobre cualquier cliente del
   negocio) casi siempre comparten la misma RPC pero necesitan permisos
   distintos — revisar los dos call sites (`grep -r "rpc(\"nombre_rpc\""`),
   no solo uno.

`create or replace function` conserva los grants/revokes ya aplicados sobre
la funcion (no hace falta repetirlos si la firma no cambia), pero toda
funcion **nueva** empieza sin ningun revoke y hay que agregarlo a mano.

## Estado actual

RLS habilitado en toda tabla de negocio (`business`, `profiles`, `bookings`,
`waitlist`, `customer_credits_ledger`, `academy_groups`,
`academy_enrollments`, `academy_payments`, `dependents`, etc. — ver
`docs/database.md` y `supabase/migrations/`). 4 RPCs `security definer`
gestionan las escrituras sensibles a condicion de carrera (`book_class`,
`cancel_booking`, `promote_from_waitlist`, `grant_credits`), mas
`reset_monthly_credits` para el cron mensual. Historial de fixes de
seguridad reales: `006`-`009` (privilegios de triggers, escalacion de
privilegios en `profiles`, fail-open de rol nulo), `011_bookings_authz_fix`
(las 4 RPCs de reservaciones se aplicaron sin chequeo de rol/tenant en su
primer review, corregido antes de continuar), `016`/`017` (regresion del
mismo patron en `cancel_booking`/`reset_monthly_credits` durante la
migracion consolidada del 2026-09-02, mas `book_class` bloqueando
auto-reserva de clientes reales — corregido antes de aplicar). Ver
`docs/CURRENT_STATE.md` para el detalle de cada caso.
