# Desarrollo local

## Requisitos

- Node.js `>= 20.19.0` (ver `.nvmrc`).
- npm (viene con Node; el proyecto usa npm workspaces, no pnpm/yarn).
- Cuenta de Supabase y, opcionalmente, Supabase CLI para desarrollo local
  de base de datos/Edge Functions.
- Cuenta de Stripe (modo test) si se va a trabajar en pagos.

## Instalar dependencias

Desde la raiz del repo (instala todos los workspaces de una vez):

```bash
npm install
```

## Variables de entorno

```bash
cp .env.example apps/web/.env
cp .env.example apps/admin/.env
```

y llenar al menos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver
`.env.example` para el detalle de cada variable).

## Correr las apps en desarrollo

```bash
npm run dev:web     # apps/web en http://localhost:5173
npm run dev:admin   # apps/admin en http://localhost:5174
```

Ambas pueden correr al mismo tiempo (puertos distintos) en dos terminales.

## Build

```bash
npm run build         # build de ambas apps
npm run build:web     # solo apps/web
npm run build:admin   # solo apps/admin
```

## Lint y typecheck

```bash
npm run lint
npm run typecheck
```

## Supabase local (opcional pero recomendado)

```bash
npm install -g supabase   # o el metodo de instalacion que prefieras
supabase login
supabase link --project-ref <tu-project-ref>
supabase db pull           # trae el esquema remoto si ya existe
supabase migration up      # aplica migraciones locales pendientes
```

Para Edge Functions en desarrollo local:

```bash
supabase functions serve <nombre-funcion>
```

## Convenciones al agregar codigo

Ver `CLAUDE.md` para las reglas de nombres de archivos, arquitectura
Feature First, capas (component -> hook -> service -> Supabase), y reglas
de TypeScript estricto.

## Camino a seguir en cada sesion (para cualquier agente de IA, no solo humanos)

Esto aplica igual si quien trabaja es Claude Code, otra IA, o una persona:
el proceso no cambia por quien lo ejecuta.

**Antes de tocar codigo:**

1. Leer `CLAUDE.md`, `docs/HANDOFF.md` y `docs/CURRENT_STATE.md` completos.
   Si la tarea toca una feature especifica, leer tambien su spec/plan en
   `docs/superpowers/specs/` y `docs/superpowers/plans/`.
2. No confiar en lo que dicen los docs a ciegas: cruzar cada afirmacion
   relevante contra el codigo/SQL real antes de asumir que algo esta
   implementado, aplicado, o funciona como se describe. Los docs se
   desactualizan; el codigo es la fuente de verdad. Esto encontro dos bugs
   reales de autorizacion en RPCs (ver `docs/security.md`) que ningun
   review de tarea individual habia detectado — se encontraron releyendo el
   SQL con el patron de la funcion hermana en mente, no leyendo el resumen
   del doc.
3. Para cambios de base de datos: revisar el patron ya establecido en
   migraciones existentes (RLS, revokes, chequeos de rol/tenant en RPCs
   `security definer` — ver checklist en `docs/security.md`) antes de
   escribir una funcion nueva o modificar una existente. Una funcion nueva
   que "se ve parecida" a una vieja pero omite un chequeo es la forma mas
   comun en que este proyecto ha introducido vulnerabilidades reales.

**Al tocar migraciones:**

4. Antes de editar un archivo en `supabase/migrations/`, confirmar si ya
   esta aplicada a Supabase (buscar su numero en `docs/CURRENT_STATE.md`,
   seccion "Migraciones existentes"). Si ya esta aplicada: nunca editarla,
   crear una migracion nueva con el numero siguiente. Si todavia no esta
   aplicada (documentada como "pendiente"/"no aplicada"): esta bien
   editarla directamente en vez de acumular migraciones que corrigen a
   otras migraciones que nunca llegaron a producción.

**Despues de un cambio importante:**

5. Correr `npm run typecheck`, `npm run lint` y `npm run build` (o los
   equivalentes por app) y confirmar que pasan antes de decir que algo esta
   terminado.
6. Actualizar `docs/CURRENT_STATE.md` (y `docs/HANDOFF.md` si aplica) en el
   mismo cambio, no despues — reflejando el estado real, incluyendo bugs
   encontrados y corregidos, no solo features nuevas.
7. No declarar nada "listo" solo porque compila: si el cambio es
   verificable en la app (UI, flujo de usuario), probarlo corriendo la app,
   no solo con tipos/lint/build.

## Estado actual

Ver `docs/CURRENT_STATE.md` para el estado real y detallado del proyecto
(features implementadas, migraciones aplicadas, deuda tecnica conocida).
