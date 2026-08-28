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

## Estado actual

Scaffolding inicial completo, sin features de negocio implementadas
todavia. Ver `docs/CURRENT_STATE.md`.
