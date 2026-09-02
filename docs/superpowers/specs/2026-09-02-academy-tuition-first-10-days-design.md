# Diseño: Colegiaturas — Pago en Primeros 10 Dias del Mes

## Contexto

Actualizacion del sub-proyecto Academia — Colegiaturas (ya implementado en
`apps/admin` con migracion `014_academy_tuition.sql`) para implementar la
regla de negocio: **fecha limite de pago = dia 10 de cada mes** (corte
global fijo, no aniversario de inscripcion).

## Alcance

**Incluye:**
1. **Actualizar logica de periodo actual** en `academyTuitionService.ts`:
   - `day_of_month` en `academy_tuition_periods` ya permite `null` (aniversario) o numero 1-28.
   - Cambiar default/configuracion a **dia 10 fijo** para todos los grupos.
   - Calculo de `period_start` / `period_end` basado en dia 10.
2. **Actualizar `AcademyGroupDetailPage` y `AcademyOverduePage`**:
   - Badge de estado muestra periodo actual basado en dia 10.
   - Vista de atrasados: `status = NO_PAGADO` y `period_end < hoy` (donde `period_end` = dia 10 del mes actual o anterior).
3. **Alertas de pago atrasado**: generar automaticamente al pasar dia 10 sin pago.
4. **Configuracion por grupo**: mantener `day_of_month` nullable en BD pero UI fuerza/valida dia 10.

**No incluye:**
- Stripe para cobro automatico (sub-proyecto Pagos).
- Notificaciones automaticas WhatsApp/email (sub-proyecto Notifications).
- Diferentes fechas de corte por grupo (negocio decidio dia 10 global).

## Modelo de datos (ya existe, solo ajustes)

Tablas existentes (`014_academy_tuition.sql`):
- `academy_tuition_periods`: `day_of_month` (1-28 o null), `amount_cents`.
- `academy_payments`: `period_start`, `period_end`, `status`, `amount_cents`.

**Ajuste:** en seed/config inicial, configurar todos los grupos con `day_of_month = 10`.

## Logica de Periodo (Frontend + Backend)

```typescript
// Dado un grupo con day_of_month = 10 y una fecha (hoy), calcular:
function getCurrentPeriod(date: Date, dayOfMonth: number = 10): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  
  // Periodo actual: del dia 10 de este mes al dia 9 del mes siguiente
  // Si hoy < dia 10 -> periodo anterior (dia 10 mes anterior a dia 9 este mes)
  // Si hoy >= dia 10 -> periodo actual (dia 10 este mes a dia 9 mes siguiente)
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (date.getDate() >= dayOfMonth) {
    // Periodo actual
    periodStart = new Date(year, month, dayOfMonth);
    periodEnd = new Date(year, month + 1, dayOfMonth - 1);
  } else {
    // Periodo anterior
    periodStart = new Date(year, month - 1, dayOfMonth);
    periodEnd = new Date(year, month, dayOfMonth - 1);
  }
  
  return { start: periodStart, end: periodEnd };
}

// Atrasado si: payment.status = 'NO_PAGADO' y period_end < hoy
function isOverdue(payment: AcademyPayment): boolean {
  return payment.status === 'NO_PAGADO' && new Date(payment.periodEnd) < new Date();
}
```

## Frontend Changes

### `apps/admin` — AcademyGroupDetailPage

- Columna "Colegiatura": badge del periodo actual (calculado con dia 10).
- Boton "Marcar pago" -> `MarkPaymentModal` con `period_start`/`period_end` precalculados.
- Si `isOverdue`: badge rojo "ATRASADO" + dias de retraso.

### `apps/admin` — AcademyOverduePage

- Query: `status = 'NO_PAGADO' AND period_end < CURRENT_DATE`.
- Columnas: Alumno, Grupo, Tutor, Telefono, Periodo (formateado "Ene 2025"), Monto, Dias atraso.
- Filtro por grupo.
- Accion "Marcar pagado" inline.

### `apps/admin` — AcademyTuitionService

- `getCurrentPeriodForGroup(groupId, date?)` -> `{ periodStart, periodEnd }`.
- `getOverduePayments(businessId, groupId?)` -> filtra `period_end < today`.

## Testing

Checklist manual:
1. Configurar grupo con day_of_month = 10, monto $1000.
2. Inscribir alumno hoy (dia 5) -> periodo actual = 10 mes anterior a 9 actual. Badge "NO_PAGADO".
3. Dia 10 pasa sin pago -> alumno aparece en `/academy/overdue` con 1 dia atraso.
4. Marcar pago -> badge verde "PAGADO", sale de atrasados.
5. Cambiar mes -> nuevo periodo generado automaticamente (o boton "Generar periodo").
6. Filtro por grupo en OverduePage funciona.

## Fuera de alcance

- Generacion automatica de periodos via trigger/pg_cron (boton manual por ahora).
- Stripe para cobro automatico.
- Notificaciones WhatsApp/email de recordatorio (sub-proyecto Notifications).
- Fechas de corte diferentes por grupo (negocio decidio dia 10 global).