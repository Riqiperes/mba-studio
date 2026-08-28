# Base de datos

Estado actual: **no hay migraciones todavia** (`supabase/migrations/` esta
vacio). Este documento describe las convenciones y el diseno planeado para
cuando se implemente, en la etapa "Database" del roadmap.

## Convenciones

- `snake_case` para tablas y columnas.
- `id uuid primary key default gen_random_uuid()`.
- `created_at timestamptz not null default now()` y
  `updated_at timestamptz not null default now()` en toda tabla mutable.
- Foreign keys explicitas con `references` y `on delete` pensado caso por
  caso (nunca por defecto `cascade` sin decidirlo).
- `unique` constraints donde el negocio lo requiera (ej. no dos bookings
  activos del mismo customer para la misma clase).
- Indexes en columnas usadas para filtrar/joinear seguido (`business_id`,
  foreign keys, columnas de fecha usadas en calendario).
- Esquema normalizado, sin duplicar informacion sin una razon documentada.

## Multi-tenant

Toda tabla que pertenece a un negocio lleva `business_id uuid references business(id)`:
`classes`, `packages`, `customers` (via `profiles`), `bookings`, `payments`,
`academy_enrollments`, etc. Hoy solo existira un `business`, pero el diseno
permite agregar mas sin rehacer tablas.

## Entidades planeadas (orden de migraciones)

1. `business` — datos del negocio (white-label): nombre, logo, colores,
   contacto, horarios. Ver `docs/white-label.md`.
2. `profiles` — datos de perfil del usuario (Supabase Auth solo maneja
   identidad; `profiles` guarda nombre, telefono, rol, `business_id`).
3. `instructors` — instructores de Studio/Academia.
4. `studio_classes` — clases de Pilates (fecha, horario, instructor,
   capacidad, estado).
5. `packages` — paquetes de clases (nombre, precio, creditos, vigencia).
6. `bookings` — reservaciones de clase, con proteccion contra doble
   reservacion y contra exceder capacidad.
7. `waitlist` — lista de espera por clase, orden determinista.
8. `academy_*` — inscripciones, grupos, horarios, colegiaturas de la
   Academia.
9. `payments` — pagos (Studio y Academia), vinculados a eventos de Stripe.
10. `notifications` — bitacora de notificaciones generadas/enviadas.

## Reglas de negocio protegidas tambien en base de datos

Las reglas criticas no dependen solo del frontend:

- Capacidad maxima de una clase: un `insert` en `bookings` que exceda la
  capacidad debe fallar (constraint/trigger o funcion RPC transaccional).
- Doble reservacion: `unique(class_id, customer_id)` (o equivalente) en
  `bookings` para reservaciones activas.
- Creditos: el consumo/devolucion de creditos ocurre en la misma
  transaccion que crea/cancela el booking, nunca como un paso separado que
  el frontend podria omitir.
- Idempotencia de pagos: `payments` guarda el id del evento de Stripe
  procesado para no otorgar creditos dos veces ante un webhook duplicado.
  Ver `docs/payments.md`.

## Migraciones

Ver `supabase/migrations/README.md` para la convencion de nombres y el
flujo de aplicacion. Nunca se edita una migracion ya aplicada en
produccion — se crea una nueva.
