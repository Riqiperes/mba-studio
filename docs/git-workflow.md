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
6. Mergear el PR a `develop` (squash o merge commit, lo que el equipo
   prefiera; evitar rebase de ramas ya compartidas).
7. Cuando `develop` esta listo para salir: PR de `develop` -> `main`,
   revisar el checklist de deploy de `docs/deployment.md`, mergear.

## Proteccion de ramas (GitHub)

Configurar en GitHub (Settings > Branches) para `main` y `develop`:

- Require a pull request before merging (sin push directo).
- Require status checks to pass (cuando haya CI).
- No permitir force-push ni borrado de la rama.

Esto se configura una sola vez desde el dashboard de GitHub (o `gh api`),
no es parte del codigo del repo.
