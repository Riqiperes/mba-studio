# Plan de accion de Frontend

Rediseno visual de `apps/web` (cliente) y despues `apps/admin` (panel). La
logica, services y hooks ya existen y funcionan; esta fase es de **UI/UX**.
Este plan es la fuente de verdad del trabajo de front hasta terminarlo.

- Rama web: `feat/web-frontend`
- Rama admin: `feat/admin-frontend` (se crea desde `develop` actualizado al
  terminar web, **no** desde la rama de web)
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
| D6 | Paginas legales (aviso de privacidad, terminos) dependen de `feat/politicas-privacidad` | Seccion 1.10 | [ ] |

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
| 1.7 | Academia: catalogo de grupos, clase de prueba, inscripcion | `/academy` | `features/academy/components/AcademyCatalogPage.tsx`, `AcademyGroupCard.tsx`, `TrialClassModal.tsx`, `EnrollAndPayModal.tsx` | [ ] |
| 1.8 | Mis reservaciones (reservas, lista de espera, creditos) | `/my-bookings` | `pages/MyBookingsPage.tsx`, `features/bookings/components/BookingCard.tsx`, `WaitlistCard.tsx`, `features/credits/components/CreditsBadge.tsx` | [ ] |
| 1.9 | Perfil (datos de la cuenta, alumnos e inscripciones, cerrar sesion) | `/profile` | `features/auth/components/UserProfilePage.tsx`, `SignOutButton.tsx` | [ ] |
| 1.10 | Pagina 404 + pie de pagina con enlaces legales (D6) | `*` | `pages/NotFoundPage.tsx` (nuevo), `App.tsx` (solo agregar la ruta), `layouts/MainLayout.tsx` | [ ] |
| 1.11 | Cierre de la fase: activar tema oscuro automatico, revision completa movil/escritorio, accesibilidad basica (contraste, foco, textos alternativos), lint/typecheck/build, `CURRENT_STATE.md`, proponer PR a `develop` | — | — | [ ] |

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
