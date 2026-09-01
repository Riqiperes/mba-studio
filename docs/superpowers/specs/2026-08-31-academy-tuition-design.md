# Diseño: Academia — Colegiaturas en `apps/admin`

## Contexto

Séptimo sub-proyecto del panel administrativo (orden acordado: clases+instructores
→ paquetes → clientes+alumnos → reservaciones+lista de espera → Academia
(grupos+inscripciones) → Academia (clientes sin cuenta) → **Academia (colegiaturas)** → Academia
(asistencia) → pagos → dashboard/notificaciones/settings — ver `docs/roadmap.md` punto 18c).

En la operación real de una academia de ballet y danza, las inscripciones generan
cobros mensuales (colegiaturas). El staff necesita marcar manualmente cada periodo
como `PAGADO` o `NO_PAGADO` cuando el tutor paga en efectivo/transferencia en
mostrador, y el sistema debe alertar cuando una colegiatura está atrasada.

## Alcance

**Incluye:**

- Migración `014_academy_tuition.sql`:
  - Nueva tabla `academy_tuition_periods` para definir periodos de cobro por grupo
    (fecha de corte fija o día del mes según inscripción del alumno).
  - Nueva tabla `academy_payments` para registrar cada cobro de colegiatura:
    `enrollment_id`, `period_start`, `period_end`, `status` (`PAGADO`/`NO_PAGADO`),
    `amount_cents`, `paid_at` (nullable), `payment_method` (`EFECTIVO`/`TRANSFERENCIA`/`OTRO`),
    `reference` (folio/referencia opcional, ver `docs/preguntas-para-negocio.md` item 3).
  - Trigger/función para generar periodos automáticamente al inscribir un alumno
    (o job manual por ahora).
- Actualización de `academyEnrollmentsService.ts`:
  - `listPaymentsByEnrollment(enrollmentId)` con paginación.
  - `upsertPayment(enrollmentId, input)` para marcar `PAGADO`/`NO_PAGADO`.
  - `getOverduePayments(businessId)` para alertas de pago atrasado.
- Nuevo componente `TuitionStatusBadge` (pill `PAGADO` verde / `NO_PAGADO` rojo).
- Nuevo modal `MarkPaymentModal` en `AcademyGroupDetailPage`:
  - Lista los periodos pendientes de una inscripción.
  - Permite marcar `PAGADO` con fecha, método, monto y referencia opcional.
  - Permite marcar `NO_PAGADO` (revertir).
- Actualización de `AcademyGroupDetailPage.tsx`:
  - Columna "Colegiatura" en la tabla de inscritos con badge de estado del
    periodo actual.
  - Botón "Marcar pago" abre `MarkPaymentModal`.
- Vista de alertas `/academy/overdue` (`AcademyOverduePage.tsx`):
  - Tabla de pagos atrasados (`status = 'NO_PAGADO'` y `period_end < today`).
  - Columnas: Alumno, Grupo, Tutor, Periodo, Monto, Días de atraso.
  - Botón "Marcar pagado" inline.
  - Link en `AdminLayout` y botón en `HomePage` (grid).

**No incluye (decisiones explícitas de este sub-proyecto):**

- Cobro automático vía Stripe — sub-proyecto Pagos (Stripe) posterior.
- Notificaciones automáticas (WhatsApp/email) al detectar pago atrasado — sub-proyecto
  Notifications posterior (ver `docs/notifications.md`).
- Reporte de cobranza/estadísticas — Dashboard posterior.

## Decisiones de negocio necesarias (antes de implementar)

De `docs/preguntas-para-negocio.md`:

1. **Item 11 — Fecha de cobro**: ¿Las colegiaturas se cobran el mismo día del mes
   en que se inscribió cada alumno, o hay una fecha de corte fija para todos
   (ej. día 5 de cada mes) sin importar cuándo se inscribieron?
   - Opción A: Día fijo global (ej. día 5) — más simple para admin.
   - Opción B: Aniversario de inscripción — más justo para el cliente.

2. **Item 3 — Referencia de pago en efectivo**: ¿Necesitan guardar un
   folio/referencia de ese pago, o con la nota libre basta?
   - Se agrega columna `reference` nullable en `academy_payments` para cubrir
     ambos casos.

## Modelo de datos (Migración `014`)

```sql
-- supabase/migrations/014_academy_tuition.sql

-- 1. Periodos de colegiatura por grupo (configuración de cuándo se cobra)
create table public.academy_tuition_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  group_id uuid not null references public.academy_groups (id) on delete cascade,
  -- Si day_of_month = null -> usa aniversario de enrollment_date del alumno
  -- Si day_of_month = 5 -> todos pagan el día 5 de cada mes
  day_of_month smallint check (day_of_month between 1 and 28),
  amount_cents integer not null check (amount_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index academy_tuition_periods_group_id_idx
  on public.academy_tuition_periods (group_id);

-- 2. Pagos de colegiatura (uno por enrollment_id + periodo)
create table public.academy_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  enrollment_id uuid not null references public.academy_enrollments (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'NO_PAGADO' check (status in ('PAGADO', 'NO_PAGADO')),
  amount_cents integer not null check (amount_cents > 0),
  paid_at timestamptz,
  payment_method text check (payment_method in ('EFECTIVO', 'TRANSFERENCIA', 'OTRO')),
  reference text, -- folio/referencia opcional
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un solo pago por enrollment + periodo (period_start identifica el mes)
  constraint academy_payments_enrollment_period_unique
    unique (enrollment_id, period_start)
);
create index academy_payments_enrollment_id_idx
  on public.academy_payments (enrollment_id);
create index academy_payments_status_period_end_idx
  on public.academy_payments (status, period_end)
  where status = 'NO_PAGADO';

-- 3. RLS
alter table public.academy_tuition_periods enable row level security;
create policy "academy_tuition_periods_manage_staff"
  on public.academy_tuition_periods for all
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

alter table public.academy_payments enable row level security;
create policy "academy_payments_manage_staff"
  on public.academy_payments for all
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

### Generación de periodos

Al inscribir un alumno (`academy_enrollments`), se deben generar los pagos
pendientes para los meses actuales/futuros según la configuración del grupo
(`academy_tuition_periods.day_of_month`). Para el MVP, esta generación puede
ser un botón manual "Generar periodos" en el detalle del grupo, o un script
SQL que el staff corra. La automatización completa (trigger + pg_cron) se
deja para fase posterior.

## Estructura de archivos y componentes

```
features/academy/
  types/
    TuitionPeriod.ts           (nuevo: TuitionPeriod, PaymentStatus)
    AcademyPayment.ts          (nuevo: AcademyPayment, PaymentInput)
  services/
    academyTuitionService.ts   (nuevo: CRUD tuition periods, payments, overdue)
  components/
    TuitionStatusBadge.tsx     (nuevo: badge verde/rojo)
    MarkPaymentModal.tsx       (nuevo: modal para marcar PAGADO/NO_PAGADO)
  components/                  (existentes actualizados)
    AcademyGroupDetailPage.tsx (columna Colegiatura + botón)
pages/
  AcademyOverduePage.tsx       (nuevo: /academy/overdue)
  HomePage.tsx                 (botón "Colegiaturas atrasadas" en grid)
  AdminLayout.tsx              (link "Colegiaturas" en nav)
```

## Validación

- Zod en `MarkPaymentModal`:
  - `amount_cents` entero positivo.
  - `payment_method` enum requerido si `status = 'PAGADO'`.
  - `paid_at` date requerida si `status = 'PAGADO'`.
  - `reference` opcional.
- `noValidate` en todos los `<form>`, cierre con tecla Escape.
- Manejo de errores con `getErrorMessage.ts`.

## Checklist de testing manual

1. Configurar periodo de colegiatura para un grupo (día fijo 5, monto $X).
2. Inscribir alumno → se generan pagos pendientes (o botón "Generar" los crea).
3. En `/academy/groups/:id` → columna "Colegiatura" muestra `NO_PAGADO` para mes actual.
4. Click "Marcar pago" → llenar monto, método `EFECTIVO`, referencia opcional, fecha hoy → `PAGADO` verde.
5. En `/academy/overdue` → aparece alumno con pago atrasado (period_end < hoy, status NO_PAGADO).
6. En `/academy/overdue` → "Marcar pagado" → sale de la lista de atrasados.
7. Tecla Escape cierra todos los modales.
8. Filtro por grupo en `/academy/overdue` funciona.