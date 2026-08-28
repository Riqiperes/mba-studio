# Arquitectura

## Vision general

Monorepo con npm workspaces. Dos aplicaciones frontend independientes
(cliente y administracion) que comparten el mismo backend Supabase y,
cuando haga falta, tipos de `packages/shared`.

```
Cliente (apps/web)  ---\
                          >---  Supabase (Auth, Postgres+RLS, Storage, Edge Functions)  ---  Stripe
Admin (apps/admin)  ---/
```

No hay servidor propio: toda la logica server-side vive en Supabase Edge
Functions (Deno) bajo `supabase/functions/`. Esto evita mantener
infraestructura adicional (sin Docker en produccion, sin Kubernetes, sin
microservicios) y mantiene el costo operativo bajo.

## Por que dos apps separadas (apps/web y apps/admin)

- Superficies de riesgo distintas: el panel administrativo puede exponer
  datos de todos los clientes de un negocio; separarlo en su propio deploy
  reduce el bundle que ve un cliente final y simplifica las reglas de
  proteccion de rutas.
- Se pueden desplegar y versionar de forma independiente.
- El panel admin puede evolucionar mas rapido sin arriesgar la experiencia
  del cliente.

Ambas comparten el mismo proyecto de Supabase (misma base de datos, mismas
policies de RLS) — la separacion es de frontend, no de backend.

## Arquitectura Feature First

Dentro de `apps/web/src` y `apps/admin/src`:

```
src/
  components/   # componentes visuales compartidos entre features
  layouts/      # layouts de pagina
  pages/        # componentes de pagina (arman layout + features)
  routes/       # definicion y proteccion de rutas
  services/     # clientes de servicios compartidos (ej. cliente base Supabase)
  lib/          # configuracion de librerias externas
  types/        # tipos compartidos por toda la app
  constants/    # constantes compartidas
  utils/        # funciones puras sin dependencias externas
  features/
    <feature>/
      components/  # UI de la feature, sin llamadas externas directas
      hooks/        # orquestacion de estado, llama a services/
      services/     # unico lugar que llama a Supabase/Stripe para esta feature
      types/        # tipos propios de la feature
```

Regla dura: los componentes visuales no llaman directamente a Supabase.
Toda comunicacion externa pasa por `features/<feature>/services/`, invocada
desde un hook. Esto hace que la logica de negocio sea testeable sin montar
componentes, y que cambiar de backend (si algun dia hiciera falta) toque
una capa, no toda la app.

Las features actuales de `apps/web`: `auth`, `studio`, `academy`,
`bookings`, `packages`, `payments`, `notifications`. Las de `apps/admin`:
`dashboard`, `classes`, `packages`, `customers`, `academy`, `payments`,
`attendance`, `waitlist`, `notifications`, `settings`.

## Flujo tipico de una accion de usuario

```
CustomerBookClassButton (component)
        v
useBookClass (hook en features/bookings/hooks)
        v
bookingsService.createBooking (features/bookings/services)
        v
Supabase (RPC o insert protegido por RLS + validacion en DB)
```

## packages/shared

Paquete de npm workspace con tipos/constantes que de verdad se comparten
entre `apps/web` y `apps/admin` (por ejemplo `UserRole`, `BusinessConfig`).
No contiene componentes ni logica de negocio. Se importa como
`@mba-studio/shared`.

## Multi-tenant / white-label (preparado, no activo)

Toda tabla de negocio tiene `business_id`. Hoy solo existe (o existira) un
registro en `business`, pero el esquema y las policies de RLS ya estan
pensadas para multiples negocios sin rehacer la base de datos. Ver
`docs/white-label.md`.

## Decisiones explicitas

- **npm workspaces en vez de pnpm/turborepo**: menos herramientas que
  instalar y aprender, suficiente para dos apps + un paquete compartido.
  Se puede migrar despues si el monorepo crece mucho.
- **Tailwind CSS v4** via `@tailwindcss/vite`: sin `tailwind.config.js`
  obligatorio, tokens de marca definidos con `@theme` en `index.css`.
- **React Router v6**: API estable y simple, evita el cambio de paradigma
  de ruteo basado en archivos.
