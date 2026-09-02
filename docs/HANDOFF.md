# Handoff — 2026-09-01

## Rama actual

Worktree principal: `C:\Users\ricar\OneDrive\Desktop\mba-studio`, rama `develop` (al día con origin).

## Qué se hizo esta sesión

Implementación completa de **Reservaciones + Lista de espera + Créditos en `apps_web` (Cliente)**:

1. **Migración `015_web_bookings_rls.sql`**: Policies RLS customer-scoped para:
   - `bookings` (`bookings_own_select`) — el cliente lee solo sus reservaciones
   - `customer_credits_ledger` (`credits_ledger_own_select`) — el cliente lee solo sus movimientos
   - `waitlist` (`waitlist_own_manage`) — el cliente inserta/borra solo sus entradas

2. **Catálogo de paquetes** (`/packages`, `/packages/:id`): lista de paquetes activos con precio, créditos, vigencia; detalle con botón "Consultar por WhatsApp" + placeholder "Comprar (próximamente)".

3. **Calendario de clases** (`/classes`): 
   - Selector de semana (← →) + botón "Hoy"
   - Tarjetas con botones contextuales según estado:
     - Cupo + créditos → "Reservar" (RPC `book_class`, consume 1 crédito)
     - Cupo + 0 créditos → "Sin créditos" (disabled)
     - Sin cupo + no en waitlist → "Unirse a lista de espera" (INSERT `waitlist` RLS own)
     - Sin cupo + en waitlist → badge posición + "Salir" (DELETE own)
     - Ya reservado → "Reservado" + "Cancelar" (RPC `cancel_booking`, devuelve crédito)

4. **Mi horario** (`/my-bookings`): lista de reservaciones activas con botón cancelar, lista de espera con posición FIFO y botón salir, badge de créditos (`💎 N`).

5. **Perfil** (`/profile`): ver/editar nombre y teléfono, muestra email, rol, fecha de registro, botón cerrar sesión.

6. **Navegación inferior fija** (mobile-first): Inicio (🏠), Paquetes (📦), Horarios (📅), Usuario (👤).

7. **Servicios y hooks**: consumen las 4 RPCs existentes (`book_class`, `cancel_booking`, `promote_from_waitlist`, `grant_credits`) — el cliente solo usa las dos primeras + INSERT/DELETE directo en `waitlist`.

## Estado del repo

```
Worktree principal: C:\Users\ricar\OneDrive\Desktop\mba-studio (rama develop, al dia con origin)
Working tree: limpio
```

## Siguiente paso sugerido

1. **Pagos (Stripe)**: Checkout + Webhook + idempotencia para compra de paquetes y otorgamiento automático de créditos.
2. Dashboard/Notificaciones/Settings.
3. Configurar Cloudflare Pages (`apps_web`, `apps_admin`).

---

## Firma de participación

### IA (opencode/nemotron-3-ultra-free) — 2026-09-01
**Qué hice:** Implementé el sub-proyecto completo de Reservaciones + Lista de espera + Créditos en `apps_web` (lado cliente), siguiendo el spec `docs/superpowers/specs/2026-09-01-web-bookings-design.md` y el plan `docs/superpowers/plans/2026-09-01-web-bookings.md`. Incluye migración RLS customer-scoped, catálogo de paquetes, calendario semanal con botones contextuales, página "Mi horario", perfil editable, navegación inferior mobile-first, y badge de créditos. Todo verificado con typecheck, lint y build en ambas apps.

**Por qué:** El cliente necesitaba la funcionalidad de autoservicio para que los usuarios finales puedan reservar sus propias clases, ver su balance de créditos y unirse a listas de espera, usando la infraestructura RPC ya existente en admin.