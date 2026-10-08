# Plan de accion de Frontend

Rediseno visual de `apps/web` (cliente) y despues `apps/admin` (panel). La
logica, services y hooks ya existen y funcionan; esta fase es de **UI/UX**.
Este plan es la fuente de verdad del trabajo de front hasta terminarlo.

- Ramas `feat/web-frontend` y `feat/admin-frontend`: ya fusionadas en
  `develop` (PR #22 y #23, 2026-10-01) y en `main` (PR #26, 2026-10-03).
  Trabajo visual nuevo sale de `develop` en una rama `feat/` propia.
- **Guia visual principal: `docs/frontend/PROMPT.md`** (paleta, tipografia,
  layout y pantallas) + kit de marca `docs/frontend/brand/` (logos, monogramas,
  motivos y fotos). Manda sobre lo decidido antes en D1-D3.
- Logos originales del PDF (SVG): `docs/frontend/logos/` (historicos; la app
  usa el kit de `brand/`)
- Referencias visuales: `docs/frontend/referencias/`
- Levantar local: `npm run dev:web` (http://localhost:5173) y
  `npm run dev:admin` (http://localhost:5174)

Estados: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho · `[-]` descartado
(con motivo en la bitacora)

---

## PENDIENTES PARA CERRAR EL FRONT AL 100% (empezar aqui)

Estado al 2026-10-03: Fases 0, 1, 2.0 y 2 terminadas, con pase de
animaciones, y ya en `develop` y `main` (en produccion). Solo falta lo de
esta lista. Marcar cada punto al resolverlo y anotarlo en la bitacora.

**0. Aprobacion del equipo (bloquea el resto de esta lista)**

- [x] Mostrar el diseño + las animaciones al equipo de trabajo, junto con
      esta lista completa de pendientes (puntos 1 a 5), para que la
      revisen y digan que cambiar antes de continuar.
- [x] Si piden cambios al diseño o a las animaciones: aplicarlos y volver
      a mostrar antes de seguir. *(sin cambios pedidos, diseño aprobado
      tal cual)*
- [x] Recien cuando el equipo apruebe el diseño tal cual esta (o con los
      cambios ya aplicados): continuar con el punto 3 (el merge de
      sincronizacion y los PR) y cerrar las decisiones de los puntos 1, 4
      y 5 con lo que el equipo haya dicho.

**1. Tareas del plan que se dejaron para el final** *(decide el equipo, ver punto 0)*

- [ ] 0.5 Decidir si se borran los archivos sin uso: `apps/web/src/pages/HomePage.tsx` (D4) y `apps/web/src/features/studio/components/ClassesFilterBar.tsx` (D5).
- [ ] 0.7 Icono `apple-touch-icon` (PNG 180x180) para "agregar a pantalla de inicio" en iPhone (web y admin).

**2. Pruebas que faltan**

- [ ] Probar en un telefono real (iPhone y Android): zoom al escribir, muesca/area segura, sensacion al tocar, hoja de los modales, tema oscuro y las animaciones nuevas (carga, alertas, semana de Clases, saldo de creditos).
- [ ] Probar la web con sesion y datos reales: reservar, cancelar, lista de espera, creditos, inscripcion y clase muestra de Academia, perfil.
- [ ] Probar el panel con un usuario admin real y datos: clases, reservaciones, clientes, alumnos, grupos, colegiaturas, usuarios, admins y vista de instructor.

**3. Integracion y publicacion**

- [x] `git merge feat/web-frontend` (estando en `feat/admin-frontend`), para
      traer los commits que solo tenia esa rama (animaciones de la fase 1,
      fix de banner/horario en columnas, perf de reservar/lista de espera).
      Sin conflictos (probado primero en seco en una rama temporal
      desechable). `typecheck` en verde para `apps/admin` y `apps/web`
      despues del merge. `feat/admin-frontend` ahora tiene el trabajo de
      ambas ramas.
- [x] PR #22 (web) y #23 (admin) a `develop`, mergeados en ese orden el 2026-10-01.
- [x] A `main` con PR #26 (2026-10-03), sin Stripe (ver `docs/stripe-test-deploy.md`); Cloudflare Pages publica desde `main`.

**4. Funcionamiento detectado sin cambiar (decidir si entra; no es diseno)** *(decide el equipo, ver punto 0)*

- [x] "Ver mi horario" en Horarios y en el perfil; "Ver detalle" en cada clase (2026-10-03).
- [x] Cancelar desde Horarios pide confirmacion, con la regla de 8 horas (2026-10-03; el texto de Mi horario prometia devolver el credito siempre y tambien se corrigio).
- [x] Semana y filtro de fechas en hora local (2026-10-03).
- [x] Cupo real con `class_booking_counts` (migracion 033, 2026-10-03).
- [ ] Varios formularios de los modales del admin usan el placeholder como unica etiqueta del campo.

**5. Opcionales** *(decide el equipo, ver punto 0)*

- [x] Boton para cambiar entre modo claro y oscuro: `ThemeToggleButton` en el header de web y admin y en ambos logins; guarda la eleccion en `localStorage` (`mba-theme`) y sin eleccion sigue al sistema. `BrandLogo` ya no usa `<picture media>` (no veia el tema forzado). Ver bitacora 2026-10-02.
- [ ] Enlaces a paginas legales (D6) cuando la rama `feat/politicas-privacidad` tenga esas paginas.

---

## Protocolo de trabajo (leer SIEMPRE antes de empezar)

El usuario pide trabajo con frases como "haz la fase 1 de la 1 a la 4". El
agente (Claude Code u otro) sigue estos pasos sin necesidad de mas
instrucciones:

1. **Leer este plan completo** y `CLAUDE.md`. Revisar la bitacora y los
   estados `[ ]`/`[~]`/`[x]` para saber donde se quedo el trabajo y que
   falta. Revisar tambien la identidad de marca: **`docs/frontend/PROMPT.md`**
   (guia visual principal), el kit `docs/frontend/brand/`, la seccion
   "Identidad de marca" de este plan, los SVG de `docs/frontend/logos/` y, si
   existe en la maquina, el PDF `docs/frontend/logos MBA.pdf` (solo local,
   esta en `.gitignore`). Colores, tipografias y logos salen de ahi, no se
   inventan.
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
7. **No cambiar comportamiento ni contenido**: services, hooks, rutas,
   queries, RLS y migraciones no se tocan. `PROMPT.md` es una guia **visual**:
   lo que hoy tiene cada pantalla es lo que se entrega. Si `PROMPT.md` pide
   algo que la app o los datos no tienen (por ejemplo "N lugares
   disponibles", paquete "MAS ELEGIDO", seccion "Tu proxima clase", textos
   de "ballet y barre"), se adapta el diseno a lo que existe y no se agrega
   ni se anota como pendiente. Se mantiene "estudio de Pilates + academia de
   ballet" y el WhatsApp del codigo (999 107 24 23).
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

## Identidad de marca v2 (fuente: `PROMPT.md` + `brand/`, 2026-09-24)

Resumen para trabajar sin releer todo; ante duda manda `PROMPT.md`.

- Sensacion: estudio de danza a media luz; crema, rosas empolvados, toques
  cafe de madera, bailarina difuminada al fondo. Sereno, ligero, editorial.
  Sin emojis, sin degradados azul-morado, sin tarjetas con borde de color a
  la izquierda.
- Tokens de marca: rosa-502 `#E5BAC1`, rosa-503 `#D09A9A`, nude-7604
  `#E4D5D3`, arena-9226 `#EBE3D7`, cloud-dancer `#F0EEE9`, grafito
  `#616160`, tinta `#1D1D1B`; derivados: malva `#9B7575`, vino `#984B5B`,
  cacao `#72573E`, caramelo `#C49378`.
- Semanticos claro / oscuro: superficie `#F0EEE9`/`#1F1917`, tarjeta
  `#FBFAF7`/`#2B2320`, suave `#EBE3D7`/`#261E1B`, texto
  `#33251F`/`#F0EEE9`, texto-suave `#72573E`/`#C9B9AE`, acento
  `#984B5B`/`#E5BAC1`, sobre-acento `#FFFFFF`/`#2A1F1C`, acento-suave
  `#F4DFE2`/`#3A2F2B`, borde `#E4D5D3`/`#3D322E`, exito
  `#4E6B55`/`#A9C6AE`, alerta `#9A4A1F`/`#F0B48F`.
- Contrastes medidos (texto): todos los pares pasan AA; el mas bajo es
  acento sobre acento-suave 4.72:1. `--borde` sobre tarjeta es 1.36:1:
  solo para separar tarjetas, **no** como unico contorno de un input (los
  inputs usan un borde mas oscuro, 3:1 minimo). Los rosas (502, 503, nude)
  nunca como color de texto sobre fondo claro.
- Tipografia: Fraunces (titulos, serif) + Jost (texto). Escala en
  `PROMPT.md` (display-l 40/44, titulo 28/34, precio 34/38, etc.).
- Radios 8 / 14 / 22 / 999. Sombras tarjeta y nav segun `PROMPT.md`.
- Header 76px con `logo-horizontal-malva.svg` a 44px. Fondo decorativo:
  `monograma-linea.svg` grande abajo a la izquierda (35%) y
  `corner-motif-rosa.svg` arriba a la derecha (55%).
- Tema oscuro: los tokens se definen con valores oscuros desde ya, pero se
  activa por `prefers-color-scheme` solo cuando todas las pantallas usen
  tokens (tarea 1.11), para no dejar pantallas a medias.
- Assets: el kit vive en `docs/frontend/brand/` (fuente) y se copia a
  `apps/web/public/brand/` solo lo que la app usa.
  `degradado-rosa.jpg` trae marco gris de escaneo: no se usa.
  `bailarina-niebla`, `siluetas-barra` y `textura-monograma` miden 287px de
  ancho: solo para tamanos chicos.

## Identidad de marca v1 (historica: `logos MBA.pdf` + SVG)

Resumen del PDF para que no haga falta abrirlo (solo existe local):

- Nombre en el logo: **Merida Ballet Academy** (monograma "MBA" entrelazado
  con forma de zapatillas/lazo). 4 paginas, todas con el logo rosa sobre
  fondo blanco. El PDF **no** trae guia de tipografias ni paleta extendida:
  solo el color del logo.
- Colores oficiales: rosa `#e5bac2` (los SVG 02 y 03 usan `#e5bac1`, misma
  tinta) para fondos claros y crema `#efeee9` para fondos oscuros.
- Contraste medido: rosa sobre blanco **1.73:1** y rosa sobre crema
  **1.49:1**. Sirve para el logo y superficies decorativas, **no** para
  texto, botones con texto blanco ni bordes de inputs (minimo 4.5:1 texto,
  3:1 componentes). Para eso se usan tonos mas oscuros derivados del mismo
  matiz (ver D1).
- La letra del logo es un rotulado propio (sans geometrica en mayusculas con
  A y R caligraficas), no una fuente instalable: el logo se usa siempre como
  SVG, nunca se reescribe con texto.
- Variantes (PDF -> SVG):

| PDF | SVG | Composicion | Uso sugerido |
|-----|-----|-------------|--------------|
| pag. 1 | `logo-mba-*-01.svg` | Monograma a la izquierda + nombre en 3 lineas | Header (horizontal, poco alto) |
| pag. 2 | `logo-mba-*-02.svg` | Monograma arriba, "MERIDA BALLET" y "ACADEMY" espaciado debajo | Login / landing |
| pag. 3 | `logo-mba-*-03.svg` | Monograma con el nombre en arco | Landing, sellos, redes |
| pag. 4 | (sin SVG) | Monograma arriba + nombre en una sola linea | Si se necesita, pedir el SVG |

- Los SVG vienen en lienzo carta (792x612) con mucho margen: al copiarlos a
  `apps/*/src/assets/` se recorta el `viewBox` al contenido.

---

## Decisiones pendientes (resolver con el usuario)

| # | Decision | Se necesita para | Estado |
|---|----------|------------------|--------|
| D1 | Paleta completa a partir del rosa y crema del logo | Fase 0 | [x] Reemplazada el 2026-09-24 por la paleta de `PROMPT.md` (ver "Identidad de marca v2"). Antes: "Rosa + crema": fondo `#fdfcf7`, superficie `#ffffff`, crema `#efeee9`, logo `#e5bac2`, acento (botones/enlaces) `#995364` y hover `#7c404e`, acento suave `#fee8ec`, texto `#292825`, texto 2o `#55544f`, borde `#d6d5d0`. Neutros calidos reemplazan `gray-*` de Tailwind |
| D2 | Tipografias (titulos y texto) | Fase 0 | [x] Fraunces (titulos) + Jost (texto), segun `PROMPT.md` (antes: solo Jost) |
| D3 | Que version del logo va en header, login y landing | Fase 0 | [x] Kit `brand/`: header `logo-horizontal-malva`, login `logo-vertical-rosa`, favicon = `monograma-malva`. Los recortes de la 0.2 se borran (confirmado por el usuario) |
| D4 | `apps/web/src/pages/HomePage.tsx` no esta en ninguna ruta: borrar o reutilizar | Fase 0 | [ ] Por ahora se deja (2026-09-24); decidir antes de cerrar 0.5 |
| D5 | `features/studio/components/ClassesFilterBar.tsx` no se usa: integrarlo en el calendario o borrarlo | Seccion 1.5 | [x] No se integra: no esta en la pagina hoy y lo que existe es lo que se entrega. Se decide si se borra junto con D4 |
| D6 | Paginas legales (aviso de privacidad, terminos) dependen de `feat/politicas-privacidad` | Seccion 1.10 | [x] Esa rama solo tiene documentos (sin paginas): no se agregan enlaces legales hasta que existan |

---

## Fase 0 — Base visual web (prerequisito de la Fase 1)

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 0.1 | Tokens de marca: paleta, tipografias, radios, sombras en `@theme` (D1, D2) | `apps/web/src/index.css`, `apps/web/index.html` (fuentes, title, meta theme-color) | [x] |
| 0.2 | Logos al proyecto (D3) y favicon | `apps/web/src/assets/`, `apps/web/public/` | [x] |
| 0.3 | Componentes base: `Button`, `Card`, `BackButton` + nuevos inputs, modal base y estados de carga / vacio / error | `apps/web/src/components/ui/` | [x] |
| 0.4 | Layout y navegacion: header con logo, `BottomNavigation`, `MainLayout`, pantalla de carga de `RequireAuth` | `layouts/MainLayout.tsx`, `components/ui/BottomNavigation.tsx`, `routes/RequireAuth.tsx` | [x] |
| 0.5 | Limpieza de archivos huerfanos (D4) | `pages/HomePage.tsx` | [ ] Se salta por ahora (2026-09-24) |
| 0.6 | Ajuste de la base al `PROMPT.md`: tokens v2 (claro + oscuro sin activar), Fraunces, radios/sombras, kit `brand/` en `public/brand/`, favicon, fondo decorativo, header 76px, nav, botones radio 14, iconos Lucide | `apps/web/src/index.css`, `apps/web/index.html`, `apps/web/public/`, `components/ui/*`, `layouts/MainLayout.tsx`, `package.json` (lucide-react) | [x] |
| 0.7 | Icono `apple-touch-icon` (PNG) para "agregar a inicio" | `apps/web/public/`, `apps/web/index.html` | [ ] Pendiente, se hace al final |

## Fase 1 — Web (cliente)

| # | Seccion | Ruta | Archivos | Estado |
|---|---------|------|----------|--------|
| 1.1 | Landing (logo, info del negocio, mapa, contacto, accesos rapidos) | `/` | `pages/LandingPage.tsx` | [x] |
| 1.2 | Login / registro (email + Google) | `/login` | `pages/LoginPage.tsx`, `features/auth/components/EmailPasswordForm.tsx`, `GoogleSignInButton.tsx` | [x] |
| 1.3 | Catalogo de paquetes | `/packages` | `features/packages/components/PackagesCatalog.tsx`, `PackageCard.tsx` | [x] |
| 1.4 | Detalle de paquete (compra hoy por WhatsApp; boton "Comprar" sigue como "proximamente" hasta que exista Stripe) | `/packages/:id` | `features/packages/components/PackageDetailPage.tsx` | [x] |
| 1.5 | Calendario de clases + selector de semana + filtros (D5) | `/classes` | `features/studio/components/ClassesCalendarPage.tsx`, `ClassesCalendar.tsx`, `WeekSelector.tsx`, `ClassesFilterBar.tsx` | [x] |
| 1.6 | Detalle de clase / reservar / lista de espera | `/classes/:id` | `features/studio/components/ClassDetailPage.tsx` | [x] |
| 1.7 | Academia: catalogo de grupos, clase de prueba, inscripcion | `/academy` | `features/academy/components/AcademyCatalogPage.tsx`, `AcademyGroupCard.tsx`, `TrialClassModal.tsx`, `EnrollAndPayModal.tsx` | [x] |
| 1.8 | Mis reservaciones (reservas, lista de espera, creditos) | `/my-bookings` | `pages/MyBookingsPage.tsx`, `features/bookings/components/BookingCard.tsx`, `WaitlistCard.tsx`, `features/credits/components/CreditsBadge.tsx` | [x] |
| 1.9 | Perfil (datos de la cuenta, alumnos e inscripciones, cerrar sesion) | `/profile` | `features/auth/components/UserProfilePage.tsx`, `SignOutButton.tsx` | [x] |
| 1.10 | Pagina 404 + pie de pagina con enlaces legales (D6) | `*` | `pages/NotFoundPage.tsx` (nuevo), `App.tsx` (solo agregar la ruta), `layouts/MainLayout.tsx` | [x] |
| 1.11 | Cierre de la fase: activar tema oscuro automatico, revision completa movil/escritorio, accesibilidad basica (contraste, foco, textos alternativos), lint/typecheck/build, `CURRENT_STATE.md`, proponer PR a `develop` | — | — | [x] |

## Fase 2.0 — Base visual admin (prerequisito de la Fase 2)

Se trabaja en `feat/admin-frontend`. Reutiliza las decisiones D1–D3.

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 2.0.1 | Tokens de marca iguales a web | `apps/admin/src/index.css`, `apps/admin/index.html` | [x] |
| 2.0.2 | Logos y favicon | `apps/admin/src/assets/`, `apps/admin/public/` | [x] |
| 2.0.3 | Componentes base: botones, inputs, modal base, tabla base, estados de carga / vacio / error | `apps/admin/src/components/ui/` | [x] |
| 2.0.4 | Layout: `AdminLayout` (menu lateral / superior), pantalla de carga de `RequireAuth` | `layouts/AdminLayout.tsx`, `routes/RequireAuth.tsx` | [x] |

## Fase 2 — Admin (panel)

Rutas relativas a `apps/admin/src/`.

| # | Seccion | Ruta | Archivos | Estado |
|---|---------|------|----------|--------|
| 2.1 | Login | `/login` | `pages/LoginPage.tsx`, `features/auth/components/GoogleSignInButton.tsx`, `SignOutButton.tsx` | [x] |
| 2.2 | Dashboard | `/` | `pages/HomePage.tsx` | [x] |
| 2.3 | Hubs Estudio y Academia | `/estudio`, `/academia` | `pages/EstudioHubPage.tsx`, `pages/AcademiaHubPage.tsx` | [x] |
| 2.4 | Clases: vista semanal, filtros, alta/edicion (incl. masiva) | `/classes` | `pages/ClassesPage.tsx`, `features/classes/components/*` | [x] |
| 2.5 | Reservaciones de una clase (agregar cliente, lista) | `/classes/:id` | `pages/ClassBookingsPage.tsx`, `features/bookings/components/BookCustomerModal.tsx` | [x] |
| 2.6 | Instructores | `/instructors` | `pages/InstructorsPage.tsx`, `features/instructors/components/*` | [x] |
| 2.7 | Paquetes | `/packages` | `pages/PackagesPage.tsx`, `features/packages/components/*` | [x] |
| 2.8 | Clientes: lista, alta sin cuenta, detalle, creditos, dependientes | `/customers`, `/customers/:id` | `pages/CustomersPage.tsx`, `pages/CustomerDetailPage.tsx`, `features/customers/components/*`, `features/credits/components/GrantCreditsModal.tsx`, `features/dependents/components/*` | [x] |
| 2.9 | Alumnos | `/students` | `pages/StudentsPage.tsx` | [x] |
| 2.10 | Academia: grupos, detalle de grupo, inscribir, marcar pago, adeudos | `/academy/groups`, `/academy/groups/:id`, `/academy/overdue` | `pages/AcademyGroupsPage.tsx`, `pages/AcademyGroupDetailPage.tsx`, `pages/AcademyOverduePage.tsx`, `features/academy/components/*` | [x] |
| 2.11 | Usuarios e invitaciones de admins | `/users`, `/admins` | `pages/UsersPage.tsx`, `pages/AdminInvitesPage.tsx`, `features/users/components/*`, `features/adminInvites/components/*` | [x] |
| 2.12 | Vista de instructor | `/instructor/my-classes` | `pages/InstructorMyClassesPage.tsx` | [x] |
| 2.13 | Cierre de la fase: revision completa, lint/typecheck/build, `CURRENT_STATE.md`, proponer PR a `develop` | — | — | [x] |

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
| 2026-09-24 | Se agrega "Identidad de marca" (resumen del PDF, variantes de logo, contrastes medidos) y el paso de revisar PDF/logos en el protocolo y `CLAUDE.md`. Decisiones D1, D2, D3 resueltas; D4 se deja abierta. |
| 2026-09-24 | 0.1 hecha: tokens en `apps/web/src/index.css` (rampa rosa, neutro calido que reemplaza `gray-*`, semanticos `page`/`surface`/`ink`/`line`/`accent`, radios y sombra) y Jost + `theme-color` + title en `apps/web/index.html`. `brand-primary`/`brand-accent` se mantienen como alias (ahora `ink`/`accent`) y se migran por seccion. Pendiente visto en el navegador: en la landing a 390px las tarjetas se salen por la derecha (layout previo, se atiende en 0.4 / 1.1). |
| 2026-09-24 | 0.2 hecha: logos recortados al contenido en `apps/web/src/assets/brand/` (horizontal, apilado, arco y monograma, sacado de los 2 primeros trazos del logo 01), componente `components/ui/BrandLogo.tsx` (archivo extra) y `public/favicon.svg` = monograma crema sobre `#995364`. Pendiente: `apple-touch-icon` PNG para "agregar a inicio" (no hay herramienta de rasterizado en el repo). |
| 2026-09-24 | 0.3 hecha: `Button` (pildora, acento solo en primary, alturas 40/44/52px, `scale(0.96)` al presionar), `Card` (radio 20px, sombra en vez de borde), `BackButton` (chevron SVG, `to`/`label` opcionales con los mismos valores por defecto) y nuevos `TextField`, `SelectField`, `ModalDialog` (`<dialog>` nativo: hoja inferior en movil, centrado en escritorio), `LoadingSpinner`, `LoadingState`, `EmptyState`, `ErrorState`. Base movil en `index.css` (skill mobile-native): sin destello al tocar, `touch-action: manipulation`, inputs de 16px en pantallas tactiles (evita el zoom de iOS), foco visible con acento, `prefers-reduced-motion`. Los ref usan el estilo de React 19 (prop `ref`). Las pantallas aun no usan los componentes nuevos: se migran en la Fase 1. |
| 2026-09-24 | 0.4 hecha: `components/ui/AppHeader.tsx` (nuevo; logo 01 fijo arriba con fondo translucido, "Iniciar sesion" como boton en el header en lugar de la franja bajo el menu), `BottomNavigation` con iconos SVG en vez de emojis e indicador rosa suave, `MainLayout` con enlace "Saltar al contenido" y espacio para el area segura del telefono (`viewport-fit=cover` en `index.html`; antes `pb-safe` no existia en Tailwind y no hacia nada), `RequireAuth` con pantalla de carga del monograma. El desborde a 390px anotado en 0.1 era un error de la captura (Edge en Windows no baja de ~500px de ancho); revisado en un marco real de 390px: no hay desborde. |
| 2026-09-24 | Se incorpora `PROMPT.md` + kit `brand/` como guia visual (commit docs). 0.6 hecha: tokens v2 en `index.css` (variables en `:root` y `[data-theme="dark"]` expuestas con `@theme inline`; oscuro sin activar hasta 1.11), escala tipografica de PROMPT, Fraunces + Jost, radios 8/14/22, sombras, neutros `gray-*` en matiz cacao (gray-500 4.79:1), `--borde-control` malva 3.87:1 para inputs. Assets usados copiados a `public/brand/`; favicon = `monograma-malva.svg`; se borran los recortes de la 0.2 (`src/assets/`). `lucide-react` para iconos. Nuevos: `buttonStyles.ts` (clases compartidas para enlaces con forma de boton) y `ScreenHeader.tsx`. Header 76px con logo malva, nav con pastilla 64x34, fondo decorativo (monograma de lineas + motivo de esquina) en `MainLayout`. `escaparate.jpg` y `estudio-arco.jpg` ya no estan en `brand/`: no se usan. |
| 2026-09-24 | 1.1 hecha (`pages/LandingPage.tsx`, `index.css` clase `.tema-claro`): banner con `bailarina-difuminada.jpg` (foto a la derecha con velo en escritorio, arriba con velo inferior en movil), etiqueta "Pilates · Ballet", titulo serif, descripcion del negocio o "Reserva tu proxima clase en {nombre}", boton "Ver horarios"; accesos rapidos con icono en circulo y flecha; "Donde estamos" con el mapa embebido de la direccion del negocio (ocupa el lugar del placeholder del mapa), WhatsApp, Llamar y "Como llegar"; pie. Sin datos del negocio la seccion de ubicacion no se muestra. No verificado: la seccion de ubicacion con datos reales (en el entorno de prueba `getBusiness` devuelve vacio). |
| 2026-09-24 | 1.2 hecha (`pages/LoginPage.tsx`, `EmailPasswordForm.tsx`, `GoogleSignInButton.tsx`; archivos extra: tipos opcionales `| undefined` en `components/ui/*` por `exactOptionalPropertyTypes`): en escritorio foto de marca fija a la izquierda y formulario a la derecha; en movil logo vertical + tarjeta. Campos con `TextField` (etiqueta visible, `autocomplete`, errores con icono), boton Google con su marca, acentos corregidos en textos y mensajes. Misma validacion, mismos servicios y mismos ids. |
| 2026-09-24 | 1.3 hecha (`PackagesCatalog.tsx`, `PackageCard.tsx`; extra `features/packages/utils/packageDisplayLabels.ts`): encabezado de pantalla con etiqueta "Estudio de Pilates", tarjeta con chips de creditos y vigencia, precio serif, "MXN · pago unico" y "Elegir paquete" (la tarjeta entera es el enlace). Estados de carga, vacio y error con los componentes base. Sin sello "Mas elegido" porque los paquetes no tienen ese dato. |
| 2026-09-24 | 1.4 hecha (`PackageDetailPage.tsx`): informacion a la izquierda (etiqueta, titulo serif, descripcion, 3 datos con icono) y tarjeta de precio fija a la derecha en escritorio con WhatsApp (primario) y "Comprar (proximamente)" deshabilitado como hoy; en movil todo apilado con los 3 datos en una fila. "No encontrado" con estado vacio y enlace a paquetes. |
| 2026-09-24 | 1.5 hecha (`ClassesCalendarPage.tsx`, `ClassesCalendar.tsx`, `WeekSelector.tsx`; extra: variante `danger` en `buttonStyles.ts`). Encabezado con etiqueta, selector de semana con flechas circulares y "Hoy", fila de 7 dias (hoy resaltado en acento, punto en los dias con clases; toca un dia para saltar a sus clases, no filtra: se sigue viendo la semana completa como hoy). Clase en rejilla [hora | datos | accion]: hora serif con a.m./p.m., instructor y duracion, "Programada · Cupo de N" (cupo maximo real), y las mismas acciones de siempre (Reservar, Reservado + Cancelar en color de alerta, lista de espera + Salir, Unirse a lista de espera, Sin creditos con explicacion). Estado vacio con monograma. Correccion: las clases se agrupan por fecha local (antes por fecha UTC, lo que movia las clases despues de las 6 pm al dia siguiente). `ClassesFilterBar` no se integra (D5). Revisado con datos de ejemplo en una pagina temporal (ya borrada) porque no hay clases en la semana actual. |
| 2026-09-24 | 1.6 hecha (`ClassDetailPage.tsx`): mismo esquema que el detalle de paquete. Etiqueta, titulo serif y estado con punto de color + texto; fecha, horario, instructor y cupo maximo con icono (en movil una sola tarjeta con separadores, en escritorio 4 tarjetas); tarjeta "Reserva tu lugar" con la hora en serif, "Reservar por WhatsApp" y "Reservar en app (proximamente)" deshabilitado como hoy. "No encontrada" con estado vacio y enlace al horario. La pagina solo encuentra clases proximas (como antes): revisado con un dato de ejemplo temporal porque todas las clases de la base ya pasaron. |
| 2026-09-24 | Revision de la rama con el metodo de `interface-review` (merge-base con `main` -> HEAD). Corregido: foco de inputs visible (anillo solido 2px acento en vez de halo al 15%), placeholder con contraste AA, dias sin clases de la fila semanal con texto para lector de pantalla. Observado y fuera de alcance visual (funcionamiento actual, sin cambios): "Cancelar" reserva no pide confirmacion; `formatWeekStartKey` usa fecha UTC (despues de las 6 pm la semana "de hoy" puede correrse un dia); el cupo del calendario solo cuenta las reservas propias. |
| 2026-09-24 | Comparacion de la rama contra el estado previo al rediseno (`e5f3e06`), leyendo las lineas eliminadas: el funcionamiento no cambio (mismos servicios, hooks, rutas, validaciones, acciones e ids). Se restauraron dos cosas del diseno anterior que se habian perdido: la seccion del mapa en Inicio vuelve a mostrarse siempre (con recuadro "Mapa de Google" mientras el negocio no tenga direccion; hoy `address`, `phone` y `whatsapp_number` estan vacios en la base) y el login vuelve a tener titulo "MBA MID" con el subtitulo "Inicia sesion / Crea tu cuenta para continuar". Nota: Inicio ya no muestra `business.logoUrl` (hoy es `null` en la base; el logo sale del kit de marca en el header). |
| 2026-09-24 | 1.7 hecha (`AcademyCatalogPage.tsx`, `AcademyGroupCard.tsx`, `TrialClassModal.tsx`, `EnrollAndPayModal.tsx`): presentacion con etiqueta, titulo serif y foto `piernas-barra.jpg` con remate en arco (`estudio-arco.jpg` ya no esta en el kit); tarjetas de grupo con horario, rango de edad en chip y mismas acciones; los dos modales pasan a `ModalDialog` con `SelectField`/`TextField` (mismos ids, validaciones y textos; ahora tambien cierran con Escape y atrapan el foco). |
| 2026-09-24 | 1.8 hecha (`MyBookingsPage.tsx`, `BookingCard.tsx`, `WaitlistCard.tsx`, `CreditsBadge.tsx`; extra `utils/dateUtils.ts` con `formatTimeParts`, reutilizado por el calendario): encabezado "Mi horario" con creditos en numero serif grande, tarjetas con columna de hora como en Horarios, mismas confirmaciones al cancelar y al salir de la lista de espera, estados de carga, vacio y error. |
| 2026-09-24 | 1.9 hecha (`UserProfilePage.tsx`, `SignOutButton.tsx`; extra `components/ui/TextAreaField.tsx`): tarjeta de perfil con inicial, correo y rol; formulario con `TextField`/`TextAreaField` (mismos ids y datos), mensajes con icono; informacion de la cuenta; inscripciones con estado en punto + texto. La inicial ya no queda vacia cuando el nombre esta en blanco. |
| 2026-09-24 | 1.10 hecha (`pages/NotFoundPage.tsx` nuevo, `App.tsx` solo la ruta `*` dentro de `MainLayout`): antes una ruta inexistente mostraba pantalla en blanco. Sin pie con enlaces legales (D6). |
| 2026-09-24 | 1.11 hecha: tema oscuro automatico con `prefers-color-scheme` (`index.css`), logo horizontal rosa en oscuro (`BrandLogo` con `<picture>`), `theme-color` por esquema y `color-scheme` en `index.html`; sin colores sueltos de Tailwind en ninguna pantalla con ruta. Verificado: lint, typecheck y build; capturas claro/oscuro en movil; sin desborde horizontal a 320 y 390 px en las 10 rutas (medido con `scrollWidth`); comparacion con el metodo de `interface-review` de las lineas eliminadas (mismos ids, manejadores, textos y confirmaciones). `docs/CURRENT_STATE.md` actualizado. No se abre PR (lo pidio el usuario). |
| 2026-09-24 | Se crea `feat/admin-frontend` desde `feat/web-frontend` (ver encabezado). Fase 2.0 hecha. 2.0.1: tokens iguales a web en `apps/admin/src/index.css` (tema oscuro definido pero sin activar hasta 2.13) + clases base del panel `.campo`/`.campo-compacto`/`.etiqueta-campo` y `.tabla-contenedor`/`.tabla` (tabla base); `index.html` con Fraunces + Jost, `viewport-fit=cover` y title. 2.0.2: kit de marca en `apps/admin/public/brand/` y favicon `monograma-malva`. 2.0.3: componentes base copiados de web a `apps/admin/src/components/ui/` (`ModalDialog` con `size` md/lg y `ScreenHeader` compacto con `actions`, propios del panel), `lucide-react` en admin. 2.0.4: `AdminLayout` con header fijo (logo + "Panel"), pestanas con icono segun rol (mismas reglas: instructor, admin de negocio, super admin), nombre y cerrar sesion, enlace "Saltar al contenido" y monograma de fondo discreto; `RequireAuth` con pantalla de carga del monograma y "Sin acceso" en tarjeta (mismos textos e id); `BackButton` con chevron y el mismo `navigate(-1)`. Revisado: lineas eliminadas con equivalente, capturas movil/escritorio con una ruta temporal (ya borrada), lint/typecheck/build web y admin. |
| 2026-09-24 | Fase 2 hecha (2.1 a 2.13) en un solo commit, como pidio el usuario. Metodo: (1) migracion mecanica de patrones repetidos a clases base y tokens (campos -> `.campo`, botones -> `buttonClasses`, tablas -> `.tabla` dentro de `.tabla-contenedor`, colores sueltos -> semanticos), revisada para que solo cambiaran cadenas de clases; (2) los 10 modales pasan a `components/ui/ModalShell.tsx` (nuevo: `<dialog>` nativo que envuelve el formulario existente sin tocarlo; Escape, foco atrapado, cierre al tocar fuera como antes, hoja inferior en movil, nombre accesible desde el `h2`); (3) diseno fino por pantalla. 2.1 Login: logo vertical, tarjeta, boton Google con su marca (misma llamada). 2.2 Dashboard y 2.3 hubs: `components/ui/HubLinkCard.tsx` (nuevo) con iconos Lucide en lugar de emojis, contador de solicitudes de Academia con texto para lector. 2.4 Clases: `ScreenHeader` con "Nueva clase", selector de semana con flechas circulares, grilla semanal con dias apilados en movil y 7 columnas en escritorio, hoy resaltado, clase cancelada marcada con texto, la tarjeta entera abre la clase con enlace (antes solo con mouse). 2.5 a 2.12: encabezados con `ScreenHeader` y etiqueta por seccion, errores con `FormMessages`/estilo comun anunciado, estados vacios `.vacio`, acciones en linea `.accion` (40px de alto), tarjetas de paquetes y grupos y filas de clientes/instructores/alumnos accesibles con teclado, colegiaturas atrasadas con filtro en el encabezado. Regresion encontrada y corregida: la migracion habia igualado el tinte verde/rojo de pago del mes en Alumnos y en el detalle de grupo; se restauro (tintes exito/alerta) y ahora ademas lleva texto ("Pagado/Pendiente este mes", "Pagada/Pendiente"). 2.13: tema oscuro automatico en admin, `theme-color` por esquema. Verificado: comparacion automatica de ids, manejadores, textos, placeholders y etiquetas contra `cde12ec` (39 diferencias, todas con equivalente: acentos, "Cargando…", modales/tarjetas que ahora usan dialogo o enlace); capturas claro/oscuro en movil y escritorio con rutas temporales (ya borradas); sin desborde horizontal a 320 y 390 px en 18 pantallas; lint, typecheck y build de admin y web. Observado sin cambiar: varios formularios de los modales usan el placeholder como unica etiqueta (ya era asi). |
| 2026-09-27 | Pase de animaciones (skills `find-animation-opportunities`, `emil-design-eng`, `animate`, `mobile-native`; `review-animations` queda reservada para invocacion directa del usuario) sobre las pantallas ya cerradas de fase 1 y 2, sin cambiar contenido ni comportamiento. Admin primero (`feat/admin-frontend`, commits `0c57ea8` y fix `892c37d`): entrada del contenido al terminar de cargar (`.entra`), entrada de alertas (`.alerta-entra`, 70 lugares), deslizamiento direccional de semana en Clases (`.semana-entra`, etiqueta + grilla, 20px/240ms), fade de filas nuevas en tablas, flash del saldo de creditos solo cuando cambia por una accion real (bug corregido: `balance` arranca en `null` y se resuelve al valor real en un segundo render, la guarda original solo cubria el primer render). Despues web (`feat/web-frontend`, commit `c58c49c`, subido a origin): mismas 5 animaciones adaptadas (Landing, catalogos, detalle de paquete/clase, Mi horario, Perfil), mas `.exito-entra` (fade+rise+scale, un poco mas expresiva) para "Solicitud enviada"/"Clase muestra solicitada" en `AcademyGroupCard`, el unico momento de "delight" que aparecio en web. Todo con `var(--ease-brand)` (unico token de curva del repo), `transform`/`opacity`/`background-color`, respetando el `prefers-reduced-motion` ya existente. Verificado: lint, typecheck y build de ambas apps en verde; `/mobile-native` sin hallazgos (mismo patron ya usado por `.modal-dialog`, sin `:hover` nuevo, sin tocar safe-area/viewport) pero sin poder probarlo en un telefono real. Pendiente: `feat/admin-frontend` no se ha sincronizado con los commits nuevos de `feat/web-frontend` (ver pendiente en la seccion de integracion); `feat/admin-frontend` sigue sin `push` a origin (decision del usuario, no se ha pedido). |
| 2026-10-03 | PR #26 (`release/design-sin-stripe`) lleva a `main` el rediseno: `develop` hasta el merge de #23 mas cherry-pick de los commits de #25, dejando fuera Stripe (#24). Despues se sincronizo `main` de vuelta en `develop`. |
| 2026-10-02 | Rama `feat/auth-ux-theme-medical-details`: (1) boton claro/oscuro (`components/ui/ThemeToggleButton.tsx` en web y admin; script en `index.html` aplica el tema guardado antes de pintar; `BrandLogo` pinta las dos versiones del logo y `index.css` oculta la que no toca con `.logo-solo-claro`/`.logo-solo-oscuro`); (2) mostrar contrasena y requisitos en vivo en el registro (`TextField` de web gana `trailing`); (3) en Reservados (`ClassBookingsPage`) el nombre abre el detalle del cliente y, solo si tiene, se muestra su condicion medica; lo mismo (sin enlace) en "Mis clases" del instructor. Probado en navegador: tema, ojo y requisitos. |
| 2026-10-01 | Equipo aprobo el diseno + animaciones tal cual estaban (punto 0) y las pruebas del punto 2 ya se hicieron. Punto 3: `git merge feat/web-frontend` estando en `feat/admin-frontend` (merge commit, sin rebase porque ambas ramas ya estan en origin) para traer los 7 commits que web tenia de mas (animaciones, fix de banner/horario en columnas, perf de reservar/lista de espera). Probado primero en seco en una rama temporal desechable: sin conflictos, ni en `docs/CURRENT_STATE.md` (el unico archivo que tocan ambas ramas). `typecheck` de `apps/admin` y `apps/web` en verde despues del merge real. `feat/admin-frontend` quedo con el trabajo de ambas ramas y se subio a origin. Pendiente: abrir PR `feat/web-frontend` -> `develop`, despues PR `feat/admin-frontend` -> `develop`, y publicar en Cloudflare Pages. |
| 2026-10-08 | Rama `feat/alertas-toast-confirmacion` (desde `main`): avisos en toda accion de web y admin. Nuevos `components/ui/AppFeedbackProvider.tsx` + `AppFeedbackContext.ts` (igual en las dos apps, montado en `main.tsx`): `useAppFeedback()` da `notify(mensaje, tono)` (toast arriba, exito/error/info, se cierra solo; es un `popover` para verse encima de un `<dialog>` abierto) y `confirm({...})` (modal de confirmacion sobre `ModalDialog`, reemplaza todos los `window.confirm`). Cancelar reservacion con menos de 8 horas muestra un aviso distinto ("Se consumira tu credito"); la regla vive en `packages/shared` (`isLateCancellation`). Reservar, lista de espera, cerrar sesion, crear/editar/eliminar/desactivar (clases, paquetes, instructores, alumnos, clientes, grupos, invitaciones, roles), otorgar creditos, pagos e inscripciones de Academia confirman y/o avisan el resultado. Errores de acciones que antes solo iban a consola ahora salen en toast. |
