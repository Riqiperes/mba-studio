# Equipo y responsabilidades

Guia de onboarding para quien se une al proyecto (persona o IA) despues del
setup inicial. Para clonar y correr el proyecto ver el README (seccion
"Instalacion") y `docs/development.md`; este documento asume que ya
corriste `npm install` y tienes las variables de entorno configuradas.

## Antes de tocar codigo, sin excepcion

Cualquiera que trabaje aqui — humano o agente de IA (Claude Code, Cursor,
Codex, Copilot, lo que sea) — sigue el mismo camino, documentado en
`docs/development.md` seccion **"Camino a seguir en cada sesion"**:

1. Leer `CLAUDE.md` completo (reglas del proyecto, no negociables).
2. Leer `docs/CURRENT_STATE.md` (estado real) y, si la tarea toca una
   feature con spec, su documento en `docs/superpowers/specs/`.
3. No confiar en lo que dicen los docs a ciegas — cruzarlo contra el
   codigo/SQL real. Los docs se desactualizan, el codigo es la fuente de
   verdad.
4. Seguir `docs/git-workflow.md`: ramas `feat/`/`fix/`/`chore/` desde
   `develop`, Pull Request para volver a `develop`, nunca push directo a
   `main`.
5. Antes de decir que algo esta listo: `npm run typecheck`, `npm run
   lint`, `npm run build` en verde, y si es verificable en la UI,
   probarlo corriendo la app — no solo que compile.

Si le vas a pedir a un agente de IA que trabaje en tu parte, dale esta
lista (o el link a `docs/development.md`) como instruccion inicial antes
de pedirle la tarea especifica. Es la diferencia entre que reproduzca el
mismo nivel de rigor del resto del proyecto o que reinvente convenciones
propias.

## Brillaldo — Stripe / pagos

Duenio de la integracion de pagos: Stripe Checkout + Webhooks para
paquetes del estudio y colegiaturas de la academia.

- Punto de partida: `docs/payments.md` (idempotencia de webhooks, regla
  no-negociable de nunca confiar en un `payment_success` del frontend) y
  `docs/roadmap.md` item 14 (Stripe Checkout + Webhook + idempotencia,
  **todavia no implementado**).
- Estado real hoy: no hay integracion de Stripe en el repo. El "pago" de
  un paquete en el admin es un badge falso (`PAGADO`/`NO_PAGADO`) sin
  cargo real — ver commit `cdf4bb5` y `docs/CURRENT_STATE.md`. Ese es el
  hueco a llenar.
- Reglas no negociables de `CLAUDE.md`: el pago se confirma solo via
  Stripe Webhook verificando la firma (`STRIPE_WEBHOOK_SECRET`); los
  webhooks deben ser idempotentes (un evento duplicado nunca otorga
  creditos dos veces); las secret keys viven solo en Edge Functions,
  nunca en variables `VITE_*` ni en el frontend.
- Antes de escribir la primera Edge Function de Stripe, revisar el patron
  ya usado en `supabase/functions/` (ver `docs/whatsapp.md` para el estilo
  de Edge Functions con `requireServiceRole` ya en el repo, aunque sea
  otro dominio) para mantener consistencia.

## Ricardo Esquivel — Frontend / bug fixer UI-UX

Duenio de la calidad visual e interaccion en `apps/web` y `apps/admin`, y
de corregir bugs de UI reportados.

- Punto de partida: `docs/architecture.md` (arquitectura Feature First,
  capas componente -> hook -> service) y la convencion de nombres de
  `CLAUDE.md` (nada de `Form.tsx`/`Card.tsx` genericos).
- Deuda tecnica conocida lista para tomar, en `docs/roadmap.md` seccion
  "Deuda tecnica conocida": `mapSaveError` en `InstructorFormModal.tsx`,
  `DependentFormModal.tsx` y `PackageFormModal.tsx` usa
  `err instanceof Error`, que nunca es cierto para un error real de
  Supabase (es un objeto plano en runtime) — el mensaje siempre cae al
  generico en vez de distinguir permiso/validacion/desconocido.
  `apps/admin/src/utils/getErrorMessage.ts` ya tiene el fix correcto por
  duck-typing (usado en las features de reservaciones y en
  `ClassFormModal.tsx`) — aplicar el mismo patron a los 3 modales de
  arriba es un primer bug bien acotado para arrancar.
- `docs/CURRENT_STATE.md` tiene el detalle de que esta implementado y
  como se ve cada pantalla — leerlo antes de "corregir" algo que en
  realidad es intencional.
- Para cualquier fix de bug: seguir `docs/superpowers/systematic-debugging`
  si esta disponible en el agente (encontrar la causa raiz en la funcion
  compartida, no parchar cada caller por separado).

## Coordinacion

Ramas de trabajo cortas (`feat/`, `fix/`) desde `develop`, PR para volver
a integrar (`docs/git-workflow.md`). Si dos personas tocan el mismo
archivo al mismo tiempo, coordinar antes por fuera de git en vez de forzar
un merge — el equipo es chico, no hace falta tooling extra para esto.
