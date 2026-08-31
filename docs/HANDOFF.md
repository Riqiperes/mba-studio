# Handoff — 2026-08-31

## Rama actual

Worktree `.worktrees/feat-admin-academy-unregistered-guardians`, rama `feat/admin-academy-unregistered-guardians` (desde `develop`).

## Qué se hizo esta sesión

Sesión de desarrollo de Academia (Clientes sin cuenta / Tutores de mostrador):

1. **Sub-proyecto 18a cerrado y mergeado**:
   - PR [#10](https://github.com/Riqiperes/mba-studio/pull/10) mergeado a `develop`.

2. **Sub-proyecto 18b implementado y verificado (Academia — Clientes sin cuenta / Tutores de mostrador)**:
   - Spec y plan redactados y aprobados por el usuario.
   - Task 1 (migración `013_dependents_unregistered_guardians.sql`: `guardian_id` nullable, columnas `guardian_name` y `guardian_phone`, check constraint de integridad) — commit `477ff62`.
   - Task 2 (actualización de tipos y servicios en `dependents` y `academyEnrollmentsService`) — commit `9518ad3`.
   - Task 3 (modal `EnrollStudentModal` con pestañas para clientes registrados y tutores de mostrador) — commit `2ec183b`.
   - Task 4 (gestión de alumnos de mostrador en `/students`, tabla formateada con teléfono y edición en `DependentFormModal` con `getErrorMessage`) — commit `e476b8f`.
   - Task 5 (verificación E2E, actualización de `docs/CURRENT_STATE.md`) — commit `294e32e`.
   - Todos los checks (`npm run typecheck`, `npm run lint`, `npm run build`) limpios en `apps/admin` y `apps/web`.
   - Rama subida a GitHub y Pull Request [#11](https://github.com/Riqiperes/mba-studio/pull/11) abierto hacia `develop`.

## Estado del repo

```
Worktree principal: C:\Users\ricar\OneDrive\Desktop\mba-studio (rama develop, al dia con origin)
Worktree activo: C:\Users\ricar\OneDrive\Desktop\mba-studio\.worktrees\feat-admin-academy-unregistered-guardians
  rama: feat/admin-academy-unregistered-guardians (pusheada a origin, PR #11 abierto)
  working tree: limpio
```

## Siguiente paso sugerido

1. Mergear PR #11 (`feat/admin-academy-unregistered-guardians` -> `develop`) en GitHub.
2. Actualizar `develop` en el repo principal (`git pull origin develop`) y limpiar el worktree.
3. Iniciar el siguiente sub-proyecto de Academia: **18c. Academia — Colegiaturas** (`docs/roadmap.md` punto 18c) para el registro de estados de pago (`PAGADO`/`NO_PAGADO`) y alertas de atraso.