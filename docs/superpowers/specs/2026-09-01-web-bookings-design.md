# Diseño: Reservaciones + Lista de espera + Créditos en `apps/web` (Cliente)

## Contexto

Quinto sub-proyecto de la app de cliente (orden acordado: Auth → Landing → Paquetes → Horarios → **Reservaciones/Créditos/Waitlist** → Pagos (Stripe) → Dashboard/Notificaciones). El panel admin ya tiene implementadas las 4 funciones RPC (`book_class`, `cancel_booking`, `promote_from_waitlist`, `grant_credits`), las tablas (`bookings`, `waitlist`, `customer_credits_ledger`) y RLS. Este sub-proyecto expone esa funcionalidad al cliente final para que pueda reservar sus propias clases, ver su balance de créditos y unirse a listas de espera.

## Alcance

**Incluye:**
- Ver mi balance de créditos actual (`customer_credits_ledger` → SUM(delta))
- Reservar una clase propia (`book_class` RPC) — consume 1 crédito, valida cupo atómicamente
- Cancelar mi propia reservación (`cancel_booking` RPC) — devuelve 1 crédito
- Unirme a la lista de espera de una clase llena (INSERT directo en `waitlist` con RLS customer-scoped)
- Salir de la lista de espera (DELETE propio en `waitlist`)
- Ver mis reservaciones activas y en lista de espera en una página "Mi horario" (`/my-bookings`)
- En la vista de clases (`/classes`), botón "Reservar" / "Lista de espera" según cupo y créditos
- Mensajes de error de las RPC en español listos para mostrar ("La clase ya no tiene cupo disponible", "El cliente no tiene créditos disponibles", etc.)

**No incluye (decisiones explícitas):**
- Promoción automática de lista de espera — sigue siendo manual por staff en admin (ver spec admin)
- Ventana de tiempo de cancelación (siempre se puede cancelar y recuperar crédito) — ver `docs/preguntas-para-negocio.md` punto 1
- Compra de paquetes / otorgamiento de créditos vía Stripe — sub-proyecto Pagos posterior
- Staff gestiona reservaciones a nombre del cliente — ya existe en admin
- Múltiples créditos por clase — fijo 1 crédito

## Modelo de datos (ya existe, migración `011`)

Mismas tablas y funciones RPC que admin. Lo que cambia son las **políticas RLS** para permitir al cliente operar sobre sus propios datos:

```sql
-- RLS para que el cliente vea SOLO sus propios datos
alter table public.bookings enable row level security;
-- Policy de lectura propia (ya existe policy de staff, se añade esta)
create policy "bookings_own_select"
  on public.bookings for select
  using (customer_id = auth.uid());

alter table public.customer_credits_ledger enable row level security;
create policy "credits_ledger_own_select"
  on public.customer_credits_ledger for select
  using (customer_id = auth.uid());

alter table public.waitlist enable row level security;
-- El cliente puede insertar/borrar SU propia entrada en waitlist
create policy "waitlist_own_manage"
  on public.waitlist for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
```

**Notas importantes:**
- Las 4 funciones RPC (`book_class`, `cancel_booking`, `promote_from_waitlist`, `grant_credits`) ya tienen `GRANT EXECUTE TO authenticated` y validan cupo/crédito internamente con `FOR UPDATE`. El cliente las invoca con `supabase.rpc(...)` — la validación ocurre en la BD, no en el frontend.
- `waitlist` no necesita RPC: el `unique index (class_id, customer_id)` evita duplicados. El cliente hace INSERT/DELETE directo con su RLS `waitlist_own_manage`.
- El cliente **nunca** invoca `grant_credits` (solo staff/admin). `promote_from_waitlist` tampoco (solo staff).

## Estructura de archivos (Feature-First, `apps/web/src/features/`)

```
features/bookings/
  types/Booking.ts
  types/WaitlistEntry.ts
  services/bookingsService.ts       (llama RPCs book_class, cancel_booking; INSERT/DELETE waitlist)
  hooks/useMyBookings.ts            (mis reservaciones activas)
  hooks/useClassBooking.ts          (reservar/cancelar/lista de espera para una clase específica)
  components/BookingCard.tsx        (tarjeta de mi reservación con botón cancelar)
  components/WaitlistCard.tsx       (tarjeta de mi entrada en lista de espera con botón salir)

features/credits/
  services/creditsService.ts        (getCreditBalance = SUM(delta))
  hooks/useMyCredits.ts             (balance actual)
  components/CreditsBadge.tsx       (badge con número de créditos)

pages/MyBookingsPage.tsx            (/my-bookings) — lista de mis reservaciones + waitlist
```

Modificados: `features/studio/components/ClassesCalendar.tsx` (botón reservar/lista de espera en cada clase), `App.tsx` (ruta `/my-bookings`), `MainLayout.tsx` (quizás badge de créditos en nav).

## Servicios

`bookingsService.ts`:
- `listMyBookings(): Promise<BookingWithClass[]>` — mis reservaciones `CONFIRMED` con info de la clase (título, instructor, horario)
- `listMyWaitlist(): Promise<WaitlistEntryWithClass[]>` — mis entradas en waitlist con info de la clase
- `bookClass(classId: string): Promise<Booking>` — `supabase.rpc('book_class', { p_customer_id: auth.uid(), p_class_id: classId })`
- `cancelBooking(bookingId: string): Promise<void>` — `supabase.rpc('cancel_booking', { p_booking_id: bookingId })`
- `joinWaitlist(classId: string): Promise<WaitlistEntry>` — INSERT directo en `waitlist` (RLS own)
- `leaveWaitlist(waitlistId: string): Promise<void>` — DELETE directo en `waitlist` (RLS own)

`creditsService.ts`:
- `getMyCreditBalance(): Promise<number>` — `SUM(delta)` sobre `customer_credits_ledger` filtrado por `customer_id = auth.uid()` (RLS ya filtra)

## UI / Flujos

**En `/classes` (ClassesCalendarPage):**
- Cada tarjeta de clase muestra botón según estado:
  - Cupo disponible + tengo ≥1 crédito → "Reservar" (llama `bookClass`, recarga)
  - Cupo disponible + 0 créditos → "Sin créditos" (disabled, link a paquetes)
  - Sin cupo + ya en waitlist → "En lista de espera" (botón "Salir" → `leaveWaitlist`)
  - Sin cupo + no en waitlist → "Unirse a lista de espera" (llama `joinWaitlist`)
- Feedback visual inmediato: toast o mensaje inline con error de RPC si falla

**Página `/my-bookings` (MyBookingsPage):**
- Sección "Mis reservaciones": lista de tarjetas (clase, fecha/hora, instructor, botón "Cancelar" con `confirm()`)
- Sección "Lista de espera": lista de tarjetas (clase, posición FIFO, botón "Salir")
- Badge de créditos visible en header

**Badge de créditos en navegación (opcional):**
- En `BottomNavigation` o header, mostrar `💎 3` con el balance actual (se actualiza tras reservar/cancelar)

## Validación

- Zod en ningún formulario (solo botones con `onClick`, no `<form>` libre)
- `noValidate` donde aplique
- Mensajes de error: los `raise exception` de las RPC ya vienen en español → mostrar `error.message` tal cual
- Deshabilitar botones mientras `loading` para evitar double-click

## Manejo de errores

- RPC errors (`raise exception`): `error.message` directo al usuario (ej. "La clase ya no tiene cupo disponible", "El cliente no tiene créditos disponibles", "El cliente ya tiene una reservacion activa para esta clase")
- Error de red/desconocido: "No se pudo completar la acción. Intenta de nuevo."
- Usar `getErrorMessage.ts` (duck-typing) ya existente en admin, replicar o compartir en `packages/shared` si se usa en ambos lados

## Testing

Sin test runner. Checklist manual en navegador real:

1. Usuario con 0 créditos ve badge "0" → botón "Reservar" disabled con tooltip "Sin créditos"
2. Usuario con 3 créditos reserva una clase con cupo → badge cambia a "2", clase aparece en `/my-bookings`
3. Usuario intenta reservar la misma clase otra vez → error "ya tiene una reservacion activa"
4. Usuario cancela su reservación → badge vuelve a "3", clase desaparece de `/my-bookings`
5. Usuario se une a waitlist de clase llena → aparece en "Lista de espera" en `/my-bookings`
6. Usuario sale de waitlist → desaparece de la lista
7. Staff en admin promueve al usuario de waitlist → usuario recibe notificación (futuro) y ve la clase en "Mis reservaciones", badge baja 1
8. Usuario sin créditos en waitlist es promovido por staff → la RPC `promote_from_waitlist` falla con "no tiene creditos disponibles", usuario sigue en waitlist (no se rompe la fila)

## Fuera de alcance (sub-proyectos futuros)

- Notificaciones push/email/WhatsApp al ser promovido de waitlist
- Ventana de tiempo para confirmar promoción automática
- Stripe Checkout para comprar paquetes y otorgar créditos automáticamente
- Dashboard con métricas de uso

## Decisiones de negocio pendientes (ver `docs/preguntas-para-negocio.md`)

1. Ventana exacta de cancelación (¿siempre libre o N horas antes?)
2. Ventana de confirmación al ser promovido de waitlist
3. Folio/referencia en pagos manuales (¿nota libre basta o necesitan folio?)