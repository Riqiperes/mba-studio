# Diseño: Reservaciones + Lista de espera en `apps/admin`

## Contexto

Cuarto sub-proyecto del panel administrativo (orden acordado: clases+
instructores → paquetes → clientes+alumnos → **reservaciones+lista de
espera** → academia → pagos → dashboard/notificaciones/settings). Hasta
ahora los clientes existen (`profiles`) y las clases existen
(`studio_classes`), pero no hay forma de reservar un cupo ni de saber
cuántos créditos tiene un cliente — nadie puede tener créditos todavía
porque Pagos (Stripe) es un sub-proyecto futuro.

Ver `docs/preguntas-para-negocio.md` para las reglas de negocio que
quedan simplificadas "por ahora" en este sub-proyecto por falta de una
decisión del negocio real (ventana de cancelación, ventana de
confirmación de lista de espera, folio de pago manual, créditos por
clase, vigencia de paquetes).

## Alcance

**Incluye:**
- Ledger de créditos por cliente (`customer_credits_ledger`), con
  otorgamiento manual desde admin — pensado para que Pagos, cuando
  exista, solo agregue el webhook de Stripe como otro escritor del mismo
  ledger, sin rediseñar nada.
- Reservar/cancelar una clase a nombre de un cliente, **solo desde
  admin** (staff actuando por teléfono/mostrador) — el cliente todavía
  no reserva su propia clase desde `apps/web`.
- Lista de espera por clase (FIFO), con promoción **manual** por staff.
- Verificación de cupo y de crédito disponible a nivel de base de datos
  (funciones RPC transaccionales), no solo en el frontend — evita
  condiciones de carrera con reservas simultáneas.

**No incluye (decisiones explícitas del usuario para este sub-proyecto):**
- Que el cliente reserve su propia clase desde `apps/web` — sub-proyecto
  futuro de autoservicio.
- Ventana de tiempo automática para cancelación o para confirmar un cupo
  de lista de espera — ver `docs/preguntas-para-negocio.md` puntos 1 y 2.
- **Promoción automática de lista de espera.** Hoy el botón "Promover"
  lo dispara el staff manualmente al ver que hay cupo libre. En una
  implementación futura (cuando exista el sistema de notificaciones real,
  no el mock actual) esto debe volverse automático: apenas se libera un
  cupo, el sistema promueve solo al primero de la fila (o le notifica y
  espera confirmación dentro de la ventana que se defina — punto 2 de
  `docs/preguntas-para-negocio.md`). El diseño de `promote_from_waitlist`
  como función RPC independiente ya deja el camino libre para que un
  trigger o un cron la invoque después sin cambiar su firma.
- Más de 1 crédito por clase (todo consumo es 1 crédito fijo).
- Expiración automática de créditos por vigencia de paquete.
- Folio/referencia de pago en el otorgamiento manual de créditos (solo
  nota libre).

## Modelo de datos (migración `011`)

```sql
create table public.customer_credits_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  customer_id uuid not null references public.profiles (id),
  delta integer not null,
  reason text not null check (reason in (
    'MANUAL_GRANT', 'PACKAGE_GRANT', 'BOOKING_CONSUMED', 'BOOKING_REFUNDED'
  )),
  granted_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now()
);
-- Sin updated_at: cada fila es un movimiento inmutable, nunca se edita.
-- El balance de un cliente = SUM(delta) de sus filas.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bookings_active_unique
  on public.bookings (class_id, customer_id)
  where status = 'CONFIRMED';

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create unique index waitlist_unique on public.waitlist (class_id, customer_id);
```

### RLS: lectura por RLS, escritura de `bookings`/`ledger` SOLO por RPC

`bookings` y `customer_credits_ledger` llevan RLS habilitado con
**únicamente una policy de `select`** (staff/admin de su `business_id`, o
`SUPER_ADMIN`) — sin policy de `insert`/`update`/`delete` para
`authenticated`. Esto fuerza a que toda escritura pase por las funciones
`SECURITY DEFINER` de abajo, que sí pueden escribir (se ejecutan con los
privilegios de su dueño, no del usuario que las invoca) porque llevan la
validación transaccional adentro. Ningún camino del frontend puede
insertar un booking o un movimiento de créditos sin pasar por esa
validación — ni por error de programación, ni por alguien llamando la
API de Supabase directo. Mismo espíritu que `docs/database.md` ya exige
("un insert en bookings que exceda la capacidad debe fallar").

`waitlist` sí lleva una policy normal `for all` (`waitlist_manage_staff`,
mismo patrón que `packages_manage_staff`) porque estar en la lista de
espera no tiene una invariante sensible a condición de carrera — el
`unique index` ya evita duplicados sin necesitar una transacción especial.

```sql
alter table public.customer_credits_ledger enable row level security;
create policy "credits_ledger_select_staff"
  on public.customer_credits_ledger for select
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.bookings enable row level security;
create policy "bookings_select_staff"
  on public.bookings for select
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.waitlist enable row level security;
create policy "waitlist_manage_staff"
  on public.waitlist for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );
```

### Funciones RPC (todas `security definer`, `set search_path = public`)

```sql
create or replace function public.book_class(p_customer_id uuid, p_class_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_business_id uuid;
  v_max_capacity integer;
  v_current_count integer;
  v_balance integer;
  v_booking public.bookings;
begin
  select business_id, max_capacity into v_business_id, v_max_capacity
  from public.studio_classes
  where id = p_class_id and status = 'SCHEDULED'
  for update;

  if not found then
    raise exception 'Clase no encontrada o no esta programada';
  end if;

  if exists (
    select 1 from public.bookings
    where class_id = p_class_id and customer_id = p_customer_id and status = 'CONFIRMED'
  ) then
    raise exception 'El cliente ya tiene una reservacion activa para esta clase';
  end if;

  select count(*) into v_current_count
  from public.bookings
  where class_id = p_class_id and status = 'CONFIRMED';

  if v_current_count >= v_max_capacity then
    raise exception 'La clase ya no tiene cupo disponible';
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.customer_credits_ledger
  where customer_id = p_customer_id;

  if v_balance < 1 then
    raise exception 'El cliente no tiene creditos disponibles';
  end if;

  insert into public.bookings (business_id, class_id, customer_id, status)
  values (v_business_id, p_class_id, p_customer_id, 'CONFIRMED')
  returning * into v_booking;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
  values (v_business_id, p_customer_id, -1, 'BOOKING_CONSUMED', auth.uid());

  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;

  if not found then
    raise exception 'Reservacion no encontrada';
  end if;
  if v_booking.status = 'CANCELLED' then
    raise exception 'La reservacion ya estaba cancelada';
  end if;

  update public.bookings set status = 'CANCELLED', updated_at = now() where id = p_booking_id;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
  values (v_booking.business_id, v_booking.customer_id, 1, 'BOOKING_REFUNDED', auth.uid());
end;
$$;

-- Reusa book_class para la validacion de cupo/credito -- si falla (sin
-- cupo, sin credito), la excepcion se propaga y la fila de waitlist NO
-- se borra (el staff puede reintentar despues). Disenada para que una
-- implementacion futura la dispare automaticamente (trigger/cron) en vez
-- de un click manual, sin cambiar su firma -- ver "No incluye" arriba.
create or replace function public.promote_from_waitlist(p_waitlist_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_entry public.waitlist;
  v_booking public.bookings;
begin
  select * into v_entry from public.waitlist where id = p_waitlist_id for update;

  if not found then
    raise exception 'Entrada de lista de espera no encontrada';
  end if;

  v_booking := public.book_class(v_entry.customer_id, v_entry.class_id);

  delete from public.waitlist where id = p_waitlist_id;

  return v_booking;
end;
$$;

create or replace function public.grant_credits(p_customer_id uuid, p_amount integer, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'La cantidad de creditos debe ser mayor a 0';
  end if;

  select business_id into v_business_id from public.profiles where id = p_customer_id;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by, notes)
  values (v_business_id, p_customer_id, p_amount, 'MANUAL_GRANT', auth.uid(), p_notes);
end;
$$;
```

`GRANT EXECUTE` sobre las 4 funciones al rol `authenticated` (necesario
explícitamente en Postgres/Supabase; sin este grant nadie puede
invocarlas aunque sean `security definer`).

## Estructura de archivos (Feature-First, `apps/admin/src/features/`)

```
features/bookings/
  types/Booking.ts
  types/WaitlistEntry.ts
  services/bookingsService.ts
  hooks/useClassBookings.ts

features/credits/
  services/creditsService.ts
  hooks/useCustomerCredits.ts

pages/ClassBookingsPage.tsx   (/classes/:id)
```

Modificados: `features/classes/components/ClassesTable.tsx` (link "Ver
reservaciones"), `pages/CustomerDetailPage.tsx` (sección de créditos),
`App.tsx` (ruta nueva).

## Servicios

`bookingsService.ts`:
- `listBookingsByClass(classId): Promise<Booking[]>` — solo `CONFIRMED`,
  con nombre del cliente (join a `profiles`, mismo patrón que
  `listAllDependents`).
- `listWaitlistByClass(classId): Promise<WaitlistEntry[]>` — ordenado por
  `created_at` ascendente (FIFO), con nombre del cliente.
- `bookClass(customerId, classId): Promise<Booking>` — `supabase.rpc('book_class', {...})`.
- `cancelBooking(bookingId): Promise<void>` — `supabase.rpc('cancel_booking', {...})`.
- `addToWaitlist(businessId, classId, customerId): Promise<WaitlistEntry>` — insert normal (RLS staff).
- `removeFromWaitlist(id): Promise<void>` — delete normal (RLS staff).
- `promoteFromWaitlist(waitlistId): Promise<Booking>` — `supabase.rpc('promote_from_waitlist', {...})`.

`creditsService.ts`:
- `getCreditBalance(customerId): Promise<number>` — `SUM(delta)` sobre
  `customer_credits_ledger` filtrado por `customer_id` (RLS ya filtra
  por `business_id`).
- `grantCredits(customerId, amount, notes?): Promise<void>` — `supabase.rpc('grant_credits', {...})`.

Los errores que lanzan las funciones RPC (`raise exception`) llegan al
frontend como `error.message` de Supabase con el texto exacto del
`raise exception` — los componentes los muestran tal cual (son mensajes
ya en español, pensados para el usuario, no necesitan el patrón
`mapSaveError` de RLS/constraint que usan los demás forms).

## UI / flujos

**`ClassesTable`**: nueva columna/acción "Ver reservaciones" → navega a
`/classes/:id`.

**`ClassBookingsPage`** (`/classes/:id`): título con el nombre de la
clase, cupo (`X/max_capacity`). Tabla de reservados (nombre, botón
"Cancelar" con `confirm()`). Botón "Reservar cliente" (selector buscable
sobre `useCustomers()`, llama `bookClass`; si la clase está llena el
botón se deshabilita y se sugiere "Agregar a lista de espera" en su
lugar — decisión explícita del staff, no automática). Tabla de lista de
espera en orden FIFO (nombre, botón "Promover" solo habilitado si hay
cupo libre, botón "Quitar de la lista").

**`CustomerDetailPage`**: nueva sección "Créditos" — balance actual
(`getCreditBalance`) y botón "Otorgar créditos" que abre un modal
(cantidad entera positiva, nota opcional) → `grantCredits`.

## Validación

Zod en el modal de otorgar créditos: cantidad entero positivo. El
selector de cliente en "Reservar" no necesita Zod (es un `<select>`
poblado, no texto libre). `noValidate` en los formularios que lo
requieran.

## Manejo de errores

Los mensajes de las funciones RPC (`raise exception`) ya vienen en
español y listos para mostrar tal cual — ver nota en Servicios. Error de
red/desconocido: mensaje genérico, igual que el resto de la app.

## Testing

Sin test runner en `apps/admin` (constante del proyecto). Checklist
manual:

1. Otorgar créditos a un cliente desde `CustomerDetailPage` → balance se
   actualiza.
2. Reservar ese cliente en una clase con cupo → aparece en el roster,
   balance baja 1.
3. Intentar reservar al mismo cliente en la misma clase otra vez →
   rechazado ("ya tiene una reservacion activa").
4. Reservar hasta llenar el cupo de una clase → siguiente intento
   rechazado ("no tiene cupo disponible"); botón "Reservar" se
   deshabilita.
5. Agregar un cliente sin crédito a lista de espera, cancelar una
   reservación existente para liberar cupo → botón "Promover" se
   habilita; promover consume su crédito y falla limpio si no tiene
   ("no tiene creditos disponibles"), sin romper la fila.
6. Cancelar una reservación → desaparece del roster, balance del cliente
   sube 1.
7. Intentar reservar a un cliente con balance 0 → rechazado ("no tiene
   creditos disponibles").

## Fuera de alcance (queda para sub-proyectos futuros)

Autoservicio en `apps/web`, promoción automática de lista de espera
(ver nota en "No incluye"), ventanas de tiempo de cancelación/
confirmación, folio de pago manual, más de 1 crédito por clase,
expiración de créditos por vigencia, Academia, Pagos (Stripe real),
Dashboard/Notificaciones/Settings.
