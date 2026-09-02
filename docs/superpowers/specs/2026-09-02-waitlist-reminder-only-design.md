# Diseño: Lista de Espera — Solo Recordatorio Manual (Sin Cola FIFO)

## Contexto

Sub-proyecto para cambiar el comportamiento de la lista de espera en Studio
(segun `docs/business-rules.md`):

- **Eliminar**: promocion automatica/manual con prioridad FIFO.
- **Implementar**: lista de espera puramente informativa + boton "Enviar
  notificacion" (recordatorio manual) en admin cuando hay cupo.
- El recordatorio **no reserva** ni da prioridad; el cliente debe entrar a
  la web y reservar manualmente si hay cupo.

## Alcance

**Incluye:**
1. **Eliminar RPC `promote_from_waitlist`** (ya no se usa).
2. **Mantener tabla `waitlist`** pero sin `unique index` estricto por
   `(class_id, customer_id)`? No, mantener unique index para evitar
   duplicados, pero permitir multiples entradas si cliente sale y vuelve a
   entrar.
3. **Admin (`apps/admin`):**
   - En `ClassBookingsPage`: cuando `bookings.length < max_capacity` y
     `waitlist.length > 0`, mostrar boton **"Enviar recordatorio"**.
   - Click -> abre modal con lista de clientes en waitlist (nombre,
     telefono/WhatsApp), boton "Enviar a todos" o individual.
   - El envio usa la abstraccion `NotificationProvider` (mock por ahora).
   - Log de notificaciones enviadas (tabla nueva `waitlist_notifications`).
4. **Web (`apps/web`):**
   - En tarjeta de clase llena: boton "Unirse a lista de espera" (INSERT
     en `waitlist` con RLS own).
   - En `/my-bookings` -> "Lista de espera": muestra posicion estimada
     (orden por `created_at`) y boton "Salir".
   - **No hay promocion automatica**: si hay cupo, cliente ve boton
     "Reservar" normal.
5. **Migracion:** agregar tabla `waitlist_notifications` para auditoria.

**No incluye:**
- Cola FIFO con prioridad.
- Promocion automatica via trigger/cron.
- Ventana de confirmacion para promovido.

## Modelo de datos (Migracion)

```sql
-- 1. Tabla de log de notificaciones de waitlist
create table public.waitlist_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  waitlist_id uuid not null references public.waitlist (id) on delete cascade,
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  sent_by uuid references public.profiles (id), -- staff que envio
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'MOCK')),
  sent_at timestamptz not null default now(),
  status text not null default 'SENT' check (status in ('SENT', 'FAILED')),
  error_message text
);
create index waitlist_notifications_waitlist_idx on public.waitlist_notifications (waitlist_id);
create index waitlist_notifications_class_idx on public.waitlist_notifications (class_id);

-- RLS
alter table public.waitlist_notifications enable row level security;
create policy "waitlist_notifications_manage_staff"
  on public.waitlist_notifications for all
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

-- 2. Eliminar RPC promote_from_waitlist (si existe)
drop function if exists public.promote_from_waitlist(uuid);
```

## Frontend

### `apps/admin` — ClassBookingsPage

```tsx
// En la seccion "Lista de espera"
{waitlist.length > 0 && bookings.length < studioClass.maxCapacity && (
  <button onClick={() => setNotificationModalOpen(true)}>
    Enviar recordatorio ({waitlist.length})
  </button>
)}

// NotificationModal
// - Lista de waitlist entries con checkbox
// - Selector de canal (WhatsApp / Email / Mock)
// - Boton "Enviar a seleccionados"
// - Log de envios previos
```

### `apps/web` — ClassesCalendar / MyBookingsPage

- Clase llena + no en waitlist: boton "Unirse a lista de espera" (INSERT `waitlist`).
- Clase llena + en waitlist: badge "En lista de espera (#N)" + boton "Salir".
- Clase con cupo: boton "Reservar" normal (cliente decide).
- **No hay badge "Te toca" ni promocion automatica**.

## Servicios

### `apps/admin/src/features/bookings/services/bookingsService.ts`

```ts
// Nueva funcion
export async function sendWaitlistReminder(
  classId: string,
  waitlistIds: string[],
  channel: 'WHATSAPP' | 'EMAIL' | 'MOCK'
): Promise<void> {
  // 1. Obtener datos de clientes (nombre, telefono, email)
  // 2. Para cada uno, construir mensaje y enviar via NotificationProvider
  // 3. Insertar en waitlist_notifications log
}
```

### `apps/web/src/features/bookings/services/bookingsService.ts`

- `joinWaitlist(classId)` — INSERT en `waitlist` (ya existe).
- `leaveWaitlist(waitlistId)` — DELETE own (ya existe).
- `listMyWaitlist()` — ya devuelve posicion FIFO estimada.

## NotificationProvider (Mock)

```ts
// apps/shared/notifications/MockWhatsAppProvider.ts
export async function sendReminder(
  phone: string,
  className: string,
  classDate: string
): Promise<void> {
  console.log(`[MOCK WA] Recordatorio a ${phone}: Hay cupo en "${className}" el ${classDate}`);
}
```

## Testing

Checklist manual:
1. Clase llena -> cliente se une a waitlist -> aparece en admin.
2. Staff cancela una reservacion -> cupo libre -> boton "Enviar recordatorio" visible.
3. Staff envia recordatorio WhatsApp -> log en `waitlist_notifications` con status SENT.
4. Cliente recibe recordatorio -> entra a web -> ve cupo -> reserva manualmente.
5. Cliente en waitlist ve cupo -> boton "Reservar" aparece (no auto-promocion).
6. Cliente sale de waitlist -> desaparece de lista.
7. Multiples notificaciones -> log individual por cliente.

## Fuera de alcance

- Promocion automatica (trigger/cron).
- Cola FIFO con prioridad y ventana de confirmacion.
- Notificaciones push reales (WhatsApp Business API, Twilio, etc.) — sub-proyecto Notifications/WhatsApp.