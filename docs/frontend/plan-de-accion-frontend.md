# Plan de accion de Frontend

Rediseno visual de `apps/web` (cliente) y despues `apps/admin` (panel). La
logica, services y hooks ya existen y funcionan; esta fase es de **UI/UX**.
No se cambia la capa de datos salvo que una pantalla lo requiera (y entonces
se documenta aqui).

- Rama web: `feat/web-frontend`
- Rama admin: `feat/admin-frontend` (se crea desde `develop` al terminar web)
- Referencias visuales: `docs/frontend/referencias/`
- Logos oficiales (SVG): `docs/frontend/logos/`
- Levantar local: `npm run dev:web` (http://localhost:5173) y
  `npm run dev:admin` (http://localhost:5174)

Estados: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho

## Fase 0 — Base visual (web)

- [ ] Identidad: logo, paleta, tipografias (definir en `index.css` con
      tokens de Tailwind v4 `@theme`).
- [ ] Componentes base en `src/components/ui/`: `Button`, `Card`,
      inputs, modales, estados de carga/vacio/error.
- [ ] `MainLayout` + `BottomNavigation` (mobile first) y header.

## Fase 1 — Web (cliente)

| # | Seccion | Ruta | Estado |
|---|---------|------|--------|
| 1 | Landing | `/` | [ ] |
| 2 | Login / registro (email + Google) | `/login` | [ ] |
| 3 | Catalogo de paquetes | `/packages` | [ ] |
| 4 | Detalle de paquete + compra | `/packages/:id` | [ ] |
| 5 | Calendario de clases + filtros | `/classes` | [ ] |
| 6 | Detalle de clase / reservar / lista de espera | `/classes/:id` | [ ] |
| 7 | Academia (grupos, clase de prueba, inscripcion) | `/academy` | [ ] |
| 8 | Mis reservaciones | `/my-bookings` | [ ] |
| 9 | Perfil (creditos, alumnos, pagos) | `/profile` | [ ] |

Al cerrar cada bloque grande: `npm run lint`, `npm run typecheck`,
`npm run build:web`, revisar en movil y escritorio, y abrir PR parcial a
`develop` si conviene.

## Fase 2 — Admin (panel)

| # | Seccion | Ruta | Estado |
|---|---------|------|--------|
| 1 | Login | `/login` | [ ] |
| 2 | Dashboard | `/` | [ ] |
| 3 | Estudio / Academia (hubs) | `/estudio`, `/academia` | [ ] |
| 4 | Clases (semana, detalle, alta masiva) | `/classes`, `/classes/:id` | [ ] |
| 5 | Instructores | `/instructors` | [ ] |
| 6 | Paquetes | `/packages` | [ ] |
| 7 | Clientes | `/customers`, `/customers/:id` | [ ] |
| 8 | Alumnos | `/students` | [ ] |
| 9 | Grupos de Academia + adeudos | `/academy/groups`, `/academy/groups/:id`, `/academy/overdue` | [ ] |
| 10 | Usuarios y admins | `/users`, `/admins` | [ ] |
| 11 | Vista de instructor | `/instructor/my-classes` | [ ] |

## Reglas que aplican (resumen de `CLAUDE.md`)

- Nombres descriptivos de archivos e IDs HTML (`landing-hero-section`,
  no `container`).
- Componentes visuales no llaman a Supabase: usan los hooks existentes de
  `features/<feature>/hooks/`.
- Sin `any`; TypeScript strict.

## Bitacora

| Fecha | Cambio |
|-------|--------|
| 2026-09-23 | Se crea el plan y la carpeta de referencias. Rama `feat/web-frontend`. |
