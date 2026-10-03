# Flujo de Git y ramas

Estructura minima para que `main` (produccion) se mantenga siempre
desplegable y el trabajo diario no choque con eso. Nada de GitFlow
completo (sin ramas `release/*` ni `hotfix/*` separadas): el equipo es
chico, hay que mantenerlo simple (ver prioridades en `CLAUDE.md`).

## Ramas permanentes

- **`main`** - produccion. Cloudflare Pages despliega esta rama como
  "Production" en `apps/web` y `apps/admin` (ver `docs/deployment.md`).
  Protegida: nadie hace push directo, todo entra via Pull Request.
- **`develop`** - integracion. Rama base para todo el trabajo nuevo. Se
  mergea a `main` (via PR) cuando el estado de `develop` esta listo para
  produccion (build, lint, typecheck en verde, y el checklist de
  `docs/deployment.md` cumplido).

## Ramas de trabajo

Se crean desde `develop`, viven poco tiempo, y se mergean de vuelta a
`develop` via Pull Request (no merge directo sin revisar):

- `feat/<nombre-corto>` - funcionalidad nueva. Ej: `feat/booking-waitlist`.
- `fix/<nombre-corto>` - correccion de bug. Ej: `fix/credit-double-charge`.
- `chore/<nombre-corto>` - mantenimiento sin cambio de comportamiento
  (deps, config, docs). Ej: `chore/update-vite`.

Un fix urgente que deba llegar a produccion antes que `develop` este
listo tambien sale de `main`, se mergea primero a `main` via PR y despues
se mergea (o rebasa) hacia `develop` para que no se pierda ahi.

## Flujo tipico

1. `git checkout develop && git pull`
2. `git checkout -b feat/nombre-de-la-tarea`
3. Trabajar, commitear con Conventional Commits (ver `CLAUDE.md`).
4. Push de la rama, abrir PR contra `develop`.
5. Cloudflare Pages genera un preview deployment automatico para el PR
   (ver `docs/deployment.md`) — probarlo ahi antes de mergear.
6. Mergear el PR a `develop` con **Create a merge commit**. Squash rompe
   el caso de dos ramas encadenadas (ej. `feat/admin-frontend` salio de
   `feat/web-frontend`): la segunda PR vuelve a ver como pendientes los
   commits ya aplanados y aparecen conflictos.
7. Cuando `develop` esta listo para salir: PR de `develop` -> `main`,
   revisar el checklist de deploy de `docs/deployment.md`, mergear.

## Sacar a produccion sin una feature que sigue en pruebas

Caso real (2026-10-03, PR #26): `develop` tenia el rediseno y Stripe, pero
Stripe no estaba listo. No usar `git revert` del merge de la feature: al
mergear `develop` despues, Git considera esos commits ya incluidos y la
feature se queda revertida en `main` sin aviso. En su lugar:

1. Rama `release/<nombre>` desde `origin/main`.
2. `git merge --no-ff <commit de develop justo antes de la feature>` (el
   primer padre del merge de su PR).
3. `git cherry-pick -x` de lo que se haya mergeado despues y no dependa de
   la feature.
4. Resolver conflictos revisando el resultado, no solo los marcadores (un
   merge automatico duplico una constante en `PackageDetailPage`), correr
   typecheck/lint/test/build, PR a `main`.
5. Despues, mergear `main` de vuelta a `develop` para que el siguiente
   `develop` -> `main` solo traiga la feature pendiente.

## Proteccion de ramas (GitHub)

Configurar en GitHub (Settings > Branches) para `main` y `develop`:

- Require a pull request before merging (sin push directo).
- Require status checks to pass (cuando haya CI).
- No permitir force-push ni borrado de la rama.

Esto se configura una sola vez desde el dashboard de GitHub (o `gh api`),
no es parte del codigo del repo.
