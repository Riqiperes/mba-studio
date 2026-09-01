# CLAUDE.md

Reglas permanentes de este proyecto. Cualquier agente (Claude Code u otro)
que trabaje aqui debe seguir esto por defecto. Si una regla necesita mas
contexto, esta linkeada a `docs/`; este archivo se mantiene corto a
proposito, no lo conviertas en un documento gigante.

## Que es esto

Plataforma de membresias y reservaciones para MBA MID: un estudio de
Pilates (paquetes, creditos, reservaciones, lista de espera) y una academia
de ballet/danza (inscripciones, colegiaturas). MVP para un solo
negocio, con la base de datos y la arquitectura preparadas para convertirse
despues en un SaaS white-label multi-negocio. No se implementa
multi-tenant real todavia, solo se deja el camino libre. Ver
`docs/white-label.md`.

> **Nota:** La funcionalidad de asistencia (control de presencia por sesión)
> fue descartada por orden de la directora. No se implementará.

## Stack (no cambiar sin razon tecnica explicada primero)

- Frontend: React + Vite + TypeScript (strict) + Tailwind CSS v4.
- Backend: Supabase (Postgres, Auth incl. Google OAuth, Storage, RLS, Edge
  Functions).
- Pagos: Stripe Checkout + Stripe Webhooks, desde Edge Functions.
- Hosting: Cloudflare Pages (frontend). Sin Docker en produccion.
- Repositorio: GitHub. Arquitectura: monorepo con npm workspaces (sin
  pnpm/turborepo: mantenerlo simple).

Explicitamente prohibido salvo justificacion tecnica fuerte: Next.js,
Django, Firebase, Prisma, MongoDB, microservicios, Kubernetes, Docker en
produccion, AWS para el MVP, GraphQL.

## Prioridades (en este orden)

1. Seguridad
2. Correctitud
3. Mantenibilidad
4. Simplicidad
5. Escalabilidad
6. Performance

No sobreingenierizar. No crear abstracciones "por si acaso". El proyecto
debe poder mantenerlo un equipo pequeno o un desarrollador junior.

## Estructura del monorepo

```
mba-studio/
  apps/
    web/      -> app de cliente (Studio + Academia)
    admin/    -> panel administrativo
  packages/
    shared/   -> tipos/constantes compartidos entre apps/web y apps/admin
  supabase/
    migrations/   -> SQL, secuencial, nunca editado una vez aplicado
    functions/    -> Edge Functions (Deno), codigo comun en functions/_shared/
  docs/       -> documentacion por tema (ver docs/architecture.md)
```

Cada app sigue arquitectura **Feature First** dentro de `src/features/<feature>/`
(`components/`, `hooks/`, `services/`, `types/`), mas carpetas compartidas a
nivel de app (`components/`, `layouts/`, `pages/`, `routes/`, `services/`,
`lib/`, `types/`, `constants/`, `utils/`). Ver `docs/architecture.md`.

## Convencion de nombres (regla que mas se rompe, la mas importante)

Todo debe ser localizable con Ctrl+Shift+F solo por el nombre del archivo.

- Mal: `Form.tsx`, `Card.tsx`, `Helper.ts`, `Utils.ts`, `Manager.ts`.
- Bien: `CustomerRegistrationForm.tsx`, `GoogleSignInButton.tsx`,
  `PackagePurchaseCard.tsx`, `ClassReservationCard.tsx`,
  `ClassCancellationModal.tsx`, `MonthlyCalendar.tsx`,
  `PaymentHistoryTable.tsx`.
- IDs de HTML descriptivos en secciones/formularios/componentes
  importantes: `register-form-container`, `monthly-calendar`,
  `admin-class-list`. Nada de `container`, `wrapper`, `box`, `div1`. No
  llenar el HTML de IDs innecesarios.

## Componentes y capas

```
Page -> Componente visual -> hook de la feature -> service de la feature -> Supabase/Stripe
```

Los componentes visuales NUNCA llaman a Supabase/Stripe directamente. Toda
llamada externa pasa por `features/<feature>/services/`. La logica de
negocio compleja vive en hooks o services, no en el JSX.

## TypeScript

Strict mode obligatorio (ver `tsconfig.base.json`, que cada app extiende).
Evitar `any`, `unknown` sin validar, y type assertions innecesarias. Tipos
explicitos por feature, cerca del codigo que los usa; solo se promueven a
`packages/shared` cuando de verdad se comparten entre `apps/web` y
`apps/admin`.

## Seguridad y roles (no negociable)

Roles: `CUSTOMER`, `STAFF`, `BUSINESS_ADMIN`, `SUPER_ADMIN`. Nunca confiar
en un rol enviado/derivado desde el frontend: el permiso real siempre se
valida con RLS y/o logica server-side. RLS obligatorio en toda tabla,
jamas desactivarlo para "resolver" un bug — el bug se resuelve arreglando
la policy. Ver `docs/security.md` y `docs/authentication.md`.

## Reglas de base de datos

Postgres via Supabase. `snake_case`, UUID como primary key, `timestamptz`,
`created_at`/`updated_at`, foreign keys explicitas, indexes donde
corresponda, esquema normalizado. Toda tabla de negocio (classes, packages,
customers, bookings, payments, academy_enrollments, etc.) lleva
`business_id` para dejar el camino libre a multi-tenant. Toda modificacion
de esquema es una migracion nueva en `supabase/migrations/`, nunca se edita
una migracion ya aplicada en produccion. Ver `docs/database.md`.

## Reglas de Stripe

Nunca confiar en un `payment_success` enviado por el frontend. El pago se
confirma solo via Stripe Webhook, verificando la firma con
`STRIPE_WEBHOOK_SECRET`. Los webhooks deben ser idempotentes: un evento
duplicado nunca debe otorgar creditos dos veces. Las secret keys viven solo
en Edge Functions / variables de servidor, nunca en el frontend ni en
variables `VITE_*`. Ver `docs/payments.md`.

## WhatsApp / notificaciones

Desacoplado detras de una interfaz `NotificationProvider`
(`MockWhatsAppProvider`, `MetaWhatsAppProvider`, `TwilioWhatsAppProvider`,
`UltraMsgWhatsAppProvider`), seleccionado por `WHATSAPP_PROVIDER`. La
logica de negocio nunca conoce el proveedor concreto. Ver
`docs/whatsapp.md` y `docs/notifications.md`.

## Reglas de Git

Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
`chore:`). Commits pequenos y descriptivos. Nunca force-push ni operaciones
destructivas sin que el usuario lo pida explicitamente. `main` es
produccion y esta protegida (sin push directo); el trabajo nuevo sale de
`develop` en ramas `feat/`, `fix/`, `chore/` y entra por Pull Request. Ver
`docs/git-workflow.md`.

## Reglas de desarrollo

- Antes de modificar codigo existente: entender la arquitectura actual,
  buscar implementaciones existentes, reutilizar, evitar duplicar. No
  reescribir un archivo completo si solo hace falta cambiar una parte. No
  tocar funcionalidad no relacionada.
- Para tareas grandes: analizar primero (que archivos se crean/modifican,
  impacto en DB/frontend/seguridad/integraciones) y comunicarlo antes de
  implementar. No hace falta pedir confirmacion para cambios pequenos.
- Despues de una funcionalidad importante: correr tests, lint, build,
  revisar cambios, actualizar `docs/CURRENT_STATE.md`. Nunca declarar algo
  terminado solo porque "parece funcionar".
- No dejar `TODO`/`FIXME`/`HACK` sin explicar por que existen; si algo se
  pospone, documentarlo en `docs/roadmap.md`.

## Documentacion viva

`docs/CURRENT_STATE.md` refleja el estado real del proyecto y se actualiza
despues de cada cambio importante. Si algo en `docs/` queda desactualizado
por un cambio, se actualiza en el mismo cambio, no despues.
