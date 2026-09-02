# Plan Maestro: Implementacion Completa Features 2026-09-02

> **Objetivo:** Implementar todas las nuevas funcionalidades definidas en specs
> 2026-09-02 en un orden logico, manteniendo build verde en cada paso.

## Orden de Implementacion

### Fase 1: Base de Datos (Migracion 016) — **PRIMERO**
- [ ] Aplicar migracion `016_comprehensive_features.sql` en Supabase dev
- [ ] Regenerar tipos TypeScript en `apps/admin` y `apps/web`
- [ ] Verificar `typecheck` en ambas apps

### Fase 2: Auth & Roles (INSTRUCTOR_ADMIN + Public Access Web)
- [ ] Actualizar enum `UserRole` en `packages/shared` + types locales
- [ ] Actualizar `RequireAuth` en `apps/admin` para permitir `INSTRUCTOR_ADMIN`
- [ ] Actualizar `AdminLayout` navegacion condicional por rol
- [ ] **Web:** Remover `RequireAuth` de rutas publicas en `App.tsx`
- [ ] **Web:** Actualizar `MainLayout`/`BottomNavigation` para acceso publico
- [ ] **Web:** `LoginPage` con soporte `redirectTo`
- [ ] **Web:** `AuthProvider` no bloquear rutas publicas
- [ ] Verificar `typecheck`/`lint`/`build` ambas apps

### Fase 3: Cancelacion 12h + Reset Mensual Creditos
- [ ] Actualizar RPC `cancel_booking` (ya en migracion, verificar)
- [ ] **Web:** `ClassesCalendarPage` / `ClassDetailPage` / `MyBookingsPage`:
  - Calcular cutoff (startsAt - 12h)
  - Mostrar mensaje "Cancela antes de X para recuperar credito"
  - Boton cancelar: si <12h -> confirmacion "Perderas credito"
- [ ] **Admin:** `ClassBookingsPage` mismo comportamiento
- [ ] **Web/Admin:** `useClassBooking` hook actualizado
- [ ] Probar RPC `reset_monthly_credits` (manual o pg_cron)

### Fase 4: Waitlist - Solo Recordatorio
- [ ] Eliminar RPC `promote_from_waitlist` (ya en migracion)
- [ ] **Admin:** `ClassBookingsPage`:
  - Boton "Enviar recordatorio" visible cuando hay cupo y waitlist > 0
  - Modal `WaitlistNotificationModal` con lista, selector canal, boton enviar
  - Servicio `sendWaitlistReminder` -> log en `waitlist_notifications`
- [ ] **Web:** `ClassesCalendarPage` / `ClassDetailPage`:
  - Sin promocion automatica
  - Cliente en waitlist ve "En lista de espera (#N)" + "Salir"
  - Si hay cupo -> boton "Reservar" normal

### Fase 5: Colegiaturas - Dia 10 Fijo
- [ ] `academyTuitionService.ts`: `getCurrentPeriodForGroup` usa dia 10
- [ ] `AcademyGroupDetailPage`: badge periodo actual basado en dia 10
- [ ] `AcademyOverduePage`: query `period_end < today` (dia 10 corte)
- [ ] `MarkPaymentModal`: `period_start`/`period_end` precalculados dia 10
- [ ] Configurar grupos existentes: `day_of_month = 10`

### Fase 6: Descuentos por Referido
- [ ] Migracion ya incluye `discount_percent` en `profiles` y `discount_applied` en `academy_payments`
- [ ] `CustomerDetailPage`: campo "Descuento referido (%)" 0-100
- [ ] `academyTuitionService.ts`: calcular monto final con descuento
- [ ] `MarkPaymentModal` / `AcademyGroupDetailPage`: mostrar monto con descuento
- [ ] Guardar `discount_applied` en pago para auditoria

### Fase 7: Campos Medicos en Dependents
- [ ] Migracion ya incluye `medical_conditions`, `age`, `notes` en `dependents`
- [ ] `DependentFormModal`: nueva seccion "Informacion medica y notas"
- [ ] `Dependent` type: `medicalConditions`, `age`, `notes`, `hasMedicalAlert`
- [ ] `ClassBookingsPage` / `AcademyGroupDetailPage`:
  - Icono alerta ⚠️ si `hasMedicalAlert`
  - Modal `MedicalAlertModal` con detalle
- [ ] RLS: solo staff/instructor_admin ven estos campos

### Fase 8: Instructor Admin Views
- [ ] Rol `INSTRUCTOR_ADMIN` en enum + types
- [ ] `RequireAuth` permite `INSTRUCTOR_ADMIN`
- [ ] `AdminLayout` navegacion condicional:
  - `INSTRUCTOR_ADMIN`: solo "Inicio", "Mis clases", "Perfil"
  - `STAFF+`: todas las opciones + filtro "Instructor"
- [ ] Nueva pagina `/instructor/my-classes` (`InstructorMyClassesPage`):
  - Lista clases del instructor (join profile.instructor_id -> studio_classes)
  - Tarjetas con "Ver alumnos" -> modal/pagina con alumnos + alertas medicas
- [ ] `ClassesPage` / `ClassBookingsPage` / `CustomersPage`:
  - Filtro "Instructor" para STAFF+
  - Para INSTRUCTOR_ADMIN: filtro fijo a su instructor_id
- [ ] Login redirect: `INSTRUCTOR_ADMIN` -> `/instructor/my-classes`
- [ ] Vinculo `profiles.instructor_id` -> `instructors.id`

### Fase 9: Academy Groups - Edad + Cupo
- [ ] Migracion ya incluye `age_min`, `age_max`, `max_capacity` (default 15, max 15)
- [ ] `AcademyGroupFormModal`: campos edad min/max, cupo (Zod validacion)
- [ ] `enrollStudent`: validar edad alumno vs rango + cupo actual
- [ ] `AcademyGroupDetailPage`: mostrar "Edad: X-Y" | "Cupo: X/15"
- [ ] `EnrollStudentModal`: validacion frontend + error claro

### Fase 10: Web Public Access (Eliminar Login Gate)
- [ ] `App.tsx`: rutas publicas SIN `RequireAuth`, privadas CON `RequireAuth`
- [ ] `MainLayout`/`BottomNavigation`: tabs siempre visibles
- [ ] `BottomNavigation`: tab "Usuario" -> `/login?redirect=/profile` si no loggeado
- [ ] `LoginPage`: soporte `redirectTo` query param
- [ ] `AuthProvider`: no bloquear rutas publicas
- [ ] `ClassesCalendarPage` / `ClassDetailPage`: botones condicionales login
- [ ] `PackagesCatalogPage` / `PackageDetailPage`: boton "Comprar" -> login si no loggeado

### Fase 11: Testing & Verificacion
- [ ] `npm run typecheck` ambas apps
- [ ] `npm run lint` ambas apps
- [ ] `npm run build` ambas apps
- [ ] Checklist manual E2E por feature (ver specs)
- [ ] Actualizar `docs/CURRENT_STATE.md`
- [ ] Commit + Push + PR

---

## Dependencias entre Fases

```
Fase 1 (DB) 
    -> Fase 2 (Auth/Roles + Web Public) 
        -> Fase 3 (Cancelacion 12h) 
        -> Fase 4 (Waitlist Recordatorio)
        -> Fase 5 (Colegiaturas Dia 10)
        -> Fase 6 (Descuentos Referido)
        -> Fase 7 (Campos Medicos)
        -> Fase 8 (Instructor Admin)
        -> Fase 9 (Academy Groups Edad/Cupo)
        -> Fase 10 (Web Public Access) [paralelo con Fase 2]
        -> Fase 11 (Testing)
```

## Comandos Utiles

```bash
# Aplicar migracion
cd supabase && supabase db push --project-ref eazyblybekyygimqpjjw

# Regenerar tipos
supabase gen types typescript --project-id eazyblybekyygimqpjjw > apps/admin/src/lib/database.types.ts
supabase gen types typescript --project-id eazyblybekyygimqpjjw > apps/web/src/lib/database.types.ts

# Verificar
cd apps/admin && npm run typecheck && npm run lint && npm run build
cd apps/web && npm run typecheck && npm run lint && npm run build
```

## Notas Importantes

1. **Migracion 016 es destructiva en algunos RLS** - probar en dev primero
2. **RPC `promote_from_waitlist` eliminado** - verificar que no hay codigo llamandolo
3. **RPC `cancel_booking` cambia comportamiento** - testing exhaustivo 12h
4. **`INSTRUCTOR_ADMIN` requiere `profiles.instructor_id` poblado** - script de seed/backfill necesario
5. **Web public access** - verificar que `RequireAuth` no se ejecuta en rutas publicas
6. **Colegiaturas dia 10** - backfill de periodos existentes si necesario