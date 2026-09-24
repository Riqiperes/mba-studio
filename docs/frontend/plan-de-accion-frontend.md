# Plan de accion de Frontend

Rediseno visual de `apps/web` (cliente) y despues `apps/admin` (panel). La
logica, services y hooks ya existen y funcionan; esta fase es de **UI/UX**.
Este plan es la fuente de verdad del trabajo de front hasta terminarlo.

- Rama web: `feat/web-frontend`
- Rama admin: `feat/admin-frontend` (se crea desde `develop` actualizado al
  terminar web, **no** desde la rama de web)
- Referencias visuales: `docs/frontend/referencias/`
- Logos oficiales (SVG): `docs/frontend/logos/` — rosa `#e5bac2` (fondos
  claros) y crema `#efeee9` (fondos oscuros)
- Levantar local: `npm run dev:web` (http://localhost:5173) y
  `npm run dev:admin` (http://localhost:5174)

Estados: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho · `[-]` descartado
(con motivo en la bitacora)

---

## Protocolo de trabajo (leer SIEMPRE antes de empezar)

El usuario pide trabajo con frases como "haz la fase 1 de la 1 a la 4". El
agente (Claude Code u otro) sigue estos pasos sin necesidad de mas
instrucciones:

1. **Leer este plan completo** y `CLAUDE.md`. Revisar la bitacora para saber
   donde se quedo el trabajo.
2. **Verificar la rama**: web se trabaja en `feat/web-frontend`, admin en
   `feat/admin-frontend`. Si hay cambios sin commit de otra cosa, avisar
   antes de continuar.
3. **Verificar prerequisitos**: ninguna seccion de la Fase 1 se empieza si
   la Fase 0 no esta en `[x]`; ninguna de la Fase 2 sin la Fase 2.0. Si
   falta, avisar al usuario y proponer hacerla primero.
4. **Decisiones de diseno abiertas** (ver "Decisiones pendientes"): si la
   seccion depende de una, preguntar al usuario antes de implementar. No
   inventar paleta, tipografia ni textos del negocio.
5. **Marcar la seccion en `[~]`** al empezarla.
6. **Tocar solo los archivos listados en la seccion** (columna "Archivos").
   Si hace falta otro archivo, se puede, pero se anota en la bitacora.
7. **No cambiar comportamiento**: services, hooks, rutas, queries, RLS y
   migraciones no se tocan. Si una mejora visual requiere funcionalidad
   nueva, se detiene, se pregunta, y si se pospone se anota en
   `docs/roadmap.md`.
8. **Reutilizar** los componentes de `src/components/ui/` creados en la
   fase base; no duplicar botones/cards/modales por pantalla.
9. **Verificar** al terminar cada seccion:
   - `npm run lint`, `npm run typecheck` y `npm run build:web` (o
     `build:admin`) en verde.
   - Revisar la pantalla en el navegador en movil (~390px) y escritorio,
     incluyendo estados de carga, vacio y error.
   - Nada se declara terminado solo porque "parece funcionar".
10. **Marcar `[x]`** la seccion, agregar una linea a la bitacora (fecha,
    secciones, archivos relevantes, pendientes).
11. **Commit por seccion** con Conventional Commits, por ejemplo
    `feat(web): redisenar catalogo de paquetes`, y `git push`. Un commit por
    seccion permite regresar a cualquier punto.
12. **Al cerrar una fase completa**: actualizar `docs/CURRENT_STATE.md` y
    proponer al usuario abrir el PR a `develop` (nunca hacer merge sin que
    el usuario lo pida).
13. **Nunca** borrar archivos, hacer force-push ni merge sin confirmacion
    explicita del usuario.

Reglas de codigo que aplican siempre (resumen de `CLAUDE.md`):

- Nombres de archivo descriptivos e IDs HTML descriptivos en secciones
  importantes (`landing-hero-section`, no `container`).
- Componentes visuales no llaman a Supabase: usan los hooks existentes de
  `features/<feature>/hooks/`.
- TypeScript strict, sin `any`.
- Mobile first: la app de cliente se usa principalmente desde el celular.
- Colores y fuentes solo via tokens de `@theme` en `index.css` (nada de
  hex sueltos en componentes), para dejar listo el white-label.

---

## Decisiones pendientes (resolver con el usuario)

| # | Decision | Se necesita para | Estado |
|---|----------|------------------|--------|
| D1 | Paleta completa (primario, acento, fondos, texto) a partir del rosa y crema del logo | Fase 0 | [ ] |
| D2 | Tipografias (titulos y texto) | Fase 0 | [ ] |
| D3 | Que version del logo va en header, login y landing (01/02/03) | Fase 0 | [ ] |
| D4 | `apps/web/src/pages/HomePage.tsx` no esta en ninguna ruta: borrar o reutilizar | Fase 0 | [ ] |
| D5 | `features/studio/components/ClassesFilterBar.tsx` no se usa: integrarlo en el calendario o borrarlo | Seccion 1.5 | [ ] |
| D6 | Paginas legales (aviso de privacidad, terminos) dependen de `feat/politicas-privacidad` | Seccion 1.10 | [ ] |

---

## Fase 0 — Base visual web (prerequisito de la Fase 1)

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 0.1 | Tokens de marca: paleta, tipografias, radios, sombras en `@theme` (D1, D2) | `apps/web/src/index.css`, `apps/web/index.html` (fuentes, title, meta theme-color) | [ ] |
| 0.2 | Logos al proyecto (D3) y favicon | `apps/web/src/assets/`, `apps/web/public/` | [ ] |
| 0.3 | Componentes base: `Button`, `Card`, `BackButton` + nuevos inputs, modal base y estados de carga / vacio / error | `apps/web/src/components/ui/` | [ ] |
| 0.4 | Layout y navegacion: header con logo, `BottomNavigation`, `MainLayout`, pantalla de carga de `RequireAuth` | `layouts/MainLayout.tsx`, `components/ui/BottomNavigation.tsx`, `routes/RequireAuth.tsx` | [ ] |
| 0.5 | Limpieza de archivos huerfanos (D4) | `pages/HomePage.tsx` | [ ] |

## Fase 1 — Web (cliente)

| # | Seccion | Ruta | Archivos | Estado |
|---|---------|------|----------|--------|
| 1.1 | Landing (logo, info del negocio, mapa, contacto, accesos rapidos) | `/` | `pages/LandingPage.tsx` | [ ] |
| 1.2 | Login / registro (email + Google) | `/login` | `pages/LoginPage.tsx`, `features/auth/components/EmailPasswordForm.tsx`, `GoogleSignInButton.tsx` | [ ] |
| 1.3 | Catalogo de paquetes | `/packages` | `features/packages/components/PackagesCatalog.tsx`, `PackageCard.tsx` | [ ] |
| 1.4 | Detalle de paquete (compra hoy por WhatsApp; boton "Comprar" sigue como "proximamente" hasta que exista Stripe) | `/packages/:id` | `features/packages/components/PackageDetailPage.tsx` | [ ] |
| 1.5 | Calendario de clases + selector de semana + filtros (D5) | `/classes` | `features/studio/components/ClassesCalendarPage.tsx`, `ClassesCalendar.tsx`, `WeekSelector.tsx`, `ClassesFilterBar.tsx` | [ ] |
| 1.6 | Detalle de clase / reservar / lista de espera | `/classes/:id` | `features/studio/components/ClassDetailPage.tsx` | [ ] |
| 1.7 | Academia: catalogo de grupos, clase de prueba, inscripcion | `/academy` | `features/academy/components/AcademyCatalogPage.tsx`, `AcademyGroupCard.tsx`, `TrialClassModal.tsx`, `EnrollAndPayModal.tsx` | [ ] |
| 1.8 | Mis reservaciones (reservas, lista de espera, creditos) | `/my-bookings` | `pages/MyBookingsPage.tsx`, `features/bookings/components/BookingCard.tsx`, `WaitlistCard.tsx`, `features/credits/components/CreditsBadge.tsx` | [ ] |
| 1.9 | Perfil (datos de la cuenta, alumnos e inscripciones, cerrar sesion) | `/profile` | `features/auth/components/UserProfilePage.tsx`, `SignOutButton.tsx` | [ ] |
| 1.10 | Pagina 404 + pie de pagina con enlaces legales (D6) | `*` | `pages/NotFoundPage.tsx` (nuevo), `App.tsx` (solo agregar la ruta), `layouts/MainLayout.tsx` | [ ] |
| 1.11 | Cierre de la fase: revision completa movil/escritorio, accesibilidad basica (contraste, foco, textos alternativos), lint/typecheck/build, `CURRENT_STATE.md`, proponer PR a `develop` | — | — | [ ] |

## Fase 2.0 — Base visual admin (prerequisito de la Fase 2)

Se trabaja en `feat/admin-frontend`. Reutiliza las decisiones D1–D3.

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 2.0.1 | Tokens de marca iguales a web | `apps/admin/src/index.css`, `apps/admin/index.html` | [ ] |
| 2.0.2 | Logos y favicon | `apps/admin/src/assets/`, `apps/admin/public/` | [ ] |
| 2.0.3 | Componentes base: botones, inputs, modal base, tabla base, estados de carga / vacio / error | `apps/admin/src/components/ui/` | [ ] |
| 2.0.4 | Layout: `AdminLayout` (menu lateral / superior), pantalla de carga de `RequireAuth` | `layouts/AdminLayout.tsx`, `routes/RequireAuth.tsx` | [ ] |

## Fase 2 — Admin (panel)

Rutas relativas a `apps/admin/src/`.

| # | Seccion | Ruta | Archivos | Estado |
|---|---------|------|----------|--------|
| 2.1 | Login | `/login` | `pages/LoginPage.tsx`, `features/auth/components/GoogleSignInButton.tsx`, `SignOutButton.tsx` | [ ] |
| 2.2 | Dashboard | `/` | `pages/HomePage.tsx` | [ ] |
| 2.3 | Hubs Estudio y Academia | `/estudio`, `/academia` | `pages/EstudioHubPage.tsx`, `pages/AcademiaHubPage.tsx` | [ ] |
| 2.4 | Clases: vista semanal, filtros, alta/edicion (incl. masiva) | `/classes` | `pages/ClassesPage.tsx`, `features/classes/components/*` | [ ] |
| 2.5 | Reservaciones de una clase (agregar cliente, lista) | `/classes/:id` | `pages/ClassBookingsPage.tsx`, `features/bookings/components/BookCustomerModal.tsx` | [ ] |
| 2.6 | Instructores | `/instructors` | `pages/InstructorsPage.tsx`, `features/instructors/components/*` | [ ] |
| 2.7 | Paquetes | `/packages` | `pages/PackagesPage.tsx`, `features/packages/components/*` | [ ] |
| 2.8 | Clientes: lista, alta sin cuenta, detalle, creditos, dependientes | `/customers`, `/customers/:id` | `pages/CustomersPage.tsx`, `pages/CustomerDetailPage.tsx`, `features/customers/components/*`, `features/credits/components/GrantCreditsModal.tsx`, `features/dependents/components/*` | [ ] |
| 2.9 | Alumnos | `/students` | `pages/StudentsPage.tsx` | [ ] |
| 2.10 | Academia: grupos, detalle de grupo, inscribir, marcar pago, adeudos | `/academy/groups`, `/academy/groups/:id`, `/academy/overdue` | `pages/AcademyGroupsPage.tsx`, `pages/AcademyGroupDetailPage.tsx`, `pages/AcademyOverduePage.tsx`, `features/academy/components/*` | [ ] |
| 2.11 | Usuarios e invitaciones de admins | `/users`, `/admins` | `pages/UsersPage.tsx`, `pages/AdminInvitesPage.tsx`, `features/users/components/*`, `features/adminInvites/components/*` | [ ] |
| 2.12 | Vista de instructor | `/instructor/my-classes` | `pages/InstructorMyClassesPage.tsx` | [ ] |
| 2.13 | Cierre de la fase: revision completa, lint/typecheck/build, `CURRENT_STATE.md`, proponer PR a `develop` | — | — | [ ] |

---

## Fuera de alcance (funcionalidad nueva, no rediseno)

Si se quiere alguna, se agrega primero a `docs/roadmap.md` como tarea aparte:

- Compra de paquetes con Stripe (hoy es por WhatsApp).
- Historial de pagos y creditos dentro del perfil (hoy los creditos se ven en
  Mis reservaciones y no hay historial de pagos en web).
- Recuperar contrasena ("olvide mi contrasena"): no existe en `authService`.
- Asistencia: descartada por la directora, no se implementa.

---

## Bitacora

| Fecha | Cambio |
|-------|--------|
| 2026-09-23 | Se crea el plan y la carpeta de referencias. Rama `feat/web-frontend`. |
| 2026-09-23 | Logos SVG en `docs/frontend/logos/`; PDF fuente fuera de Git. |
| 2026-09-23 | Plan verificado contra todas las rutas y componentes de `apps/web` y `apps/admin`. Se agregan: protocolo de trabajo, decisiones pendientes, Fase 0 con archivos, Fase 2.0 (base admin), 404 + legales, reservaciones de clase en admin, cierre de fase y "fuera de alcance". |
