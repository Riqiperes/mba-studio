# Diseño: Politica de Cancelacion (12h) + Reset Mensual de Creditos

## Contexto

Sub-proyecto para implementar las reglas de negocio definidas en
`docs/business-rules.md`:
- Ventana de 12 horas antes de la clase para cancelar y recuperar credito.
- Cancelacion dentro de 12h o no-show: se cobra el credito (no se devuelve).
- Reset mensual automatico de creditos (dia 1 de cada mes): creditos no usados expiran.

Afecta: `apps/web` (cliente), `apps/admin` (staff), RPC `cancel_booking`,
nuevo RPC `reset_monthly_credits` (o cron job).

## Alcance

**Incluye:**
1. **Modificar RPC `cancel_booking`** para validar la ventana de 12h:
   - Si `now() < class.starts_at - interval '12 hours'` -> cancelar + devolver credito.
   - Si `now() >= class.starts_at - interval '12 hours'` -> cancelar PERO **no** devolver credito (registrar `BOOKING_CANCELLED_LATE` en ledger con delta 0).
2. **Nuevo RPC `reset_monthly_credits`** (o funcion para cron):
   - Ejecutar dia 1 de cada mes (via pg_cron o Edge Function programada).
   - Para cada cliente: calcular creditos actuales, mover a `EXPIRED` o crear entrada de ajuste negativo para poner balance en 0.
   - Opcional: enviar notificacion previa (dia 25-28) avisando expiracion.
3. **Frontend web (`apps/web`):**
   - En `/my-bookings` y tarjetas de clase: mostrar mensaje "Cancela antes de [fecha-12h] para recuperar tu credito".
   - Deshabilitar boton cancelar si ya paso la ventana (o mostrar confirmacion "Perderas el credito").
3. **Frontend admin (`apps/admin`):**
   - En `ClassBookingsPage`: mismo comportamiento, staff ve advertencia si cancela tarde.
4. **Migracion:** agregar columna `cancelled_late` o `refunded` en `bookings` para auditoria, y tipo de razon `BOOKING_CANCELLED_LATE` en `customer_credits_ledger`.

**No incluye:**
- Notificaciones automaticas de recordatorio (sub-proyecto Notifications).
- Stripe refunds (solo creditos internos).

## Modelo de datos (Migracion nueva)

```sql
-- 1. Agregar columna para tracking de cancelacion tardia en bookings
alter table public.bookings
  add column cancelled_at timestamptz,
  add column refunded boolean not null default false;

-- 2. Agregar nueva razon en customer_credits_ledger
alter type public.credit_reason add value 'BOOKING_CANCELLED_LATE';
-- Nota: si credit_reason no es enum, agregar check constraint o valor permitido en check

-- 3. Indice para queries de reset mensual
create index customer_credits_ledger_customer_created_idx
  on public.customer_credits_ledger (customer_id, created_at);
```

## RPCs

### `cancel_booking(p_booking_id uuid, p_actor_role text default 'CLIENT')`

```sql
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
  v_class public.studio_classes;
  v_cutoff timestamptz;
  v_refund boolean;
begin
  -- Lock booking
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Reservacion no encontrada';
  end if;
  if v_booking.status = 'CANCELLED' then
    raise exception 'La reservacion ya estaba cancelada';
  end if;

  -- Get class info
  select * into v_class from public.studio_classes where id = v_booking.class_id for share;
  if not found then
    raise exception 'Clase no encontrada';
  end if;

  -- Determine cutoff (12 hours before class)
  v_cutoff := v_class.starts_at - interval '12 hours';
  v_refund := (now() < v_cutoff);

  -- Update booking
  update public.bookings
  set status = 'CANCELLED',
      cancelled_at = now(),
      refunded = v_refund,
      updated_at = now()
  where id = p_booking_id;

  -- Credit ledger entry
  if v_refund then
    insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
    values (v_booking.business_id, v_booking.customer_id, 1, 'BOOKING_REFUNDED', auth.uid());
  else
    insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
    values (v_booking.business_id, v_booking.customer_id, 0, 'BOOKING_CANCELLED_LATE', auth.uid());
  end if;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;
```

### `reset_monthly_credits()` — para pg_cron o Edge Function

```sql
create or replace function public.reset_monthly_credits()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_customer record;
  v_balance integer;
begin
  -- For each customer with positive balance, expire credits
  for v_customer in
    select customer_id, business_id, coalesce(sum(delta), 0) as balance
    from public.customer_credits_ledger
    group by customer_id, business_id
    having coalesce(sum(delta), 0) > 0
  loop
    insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
    values (v_customer.business_id, v_customer.customer_id, -v_customer.balance, 'MONTHLY_EXPIRATION', null);
  end loop;
end;
$$;

-- Schedule via pg_cron (run at 00:00 UTC on day 1 of each month)
-- select cron.schedule('monthly-credit-reset', '0 0 1 * *', 'select public.reset_monthly_credits();');
```

## Frontend Changes

### `apps/web` — ClassesCalendar / ClassDetail / MyBookingsPage

- Prop `cutoffDate` en cada clase: `startsAt - 12h`.
- En `BookingCard`: si `now() < cutoffDate` -> boton "Cancelar" normal. Si `now() >= cutoffDate` -> boton "Cancelar (pierdes credito)" con confirmacion explicita.
- Mensaje informativo: "Puedes cancelar gratis hasta 12 horas antes: [fecha corte]".

### `apps/admin` — ClassBookingsPage

- Mismo comportamiento para staff.
- Columna "Ventana" en tabla de reservados: verde si >12h, rojo si <=12h.

## Testing

Checklist manual:
1. Reservar clase -> cancelar 13h antes -> credito devuelto, booking `refunded=true`.
2. Reservar clase -> cancelar 11h antes -> credito NO devuelto, ledger `BOOKING_CANCELLED_LATE`, booking `refunded=false`.
3. No-show (no cancelar, clase pasa) -> no hay entrada de refund (manejo aparte).
4. Reset mensual (dia 1): cliente con 3 creditos -> balance 0, ledger `MONTHLY_EXPIRATION` con -3.
5. Cliente con 0 creditos -> reset no hace nada.
6. Staff cancela en admin 11h antes -> mismo comportamiento (no refund).

## Fuera de alcance

- Notificaciones push/email de "te quedan X horas para cancelar gratis".
- Stripe refunds para pagos con tarjeta (solo creditos internos).
- Excepciones manuales (staff force-refund) — futuro.