# Diseño: Vista Semanal de Clases + Creación en Lote (Admin)

## Contexto

`apps/admin/src/pages/ClassesPage.tsx` hoy lista clases en una tabla plana
con filtros de instructor/estado/fecha-desde/fecha-hasta. Crear una clase
recurrente (ej. Pilates 6am Lunes/Miércoles/Viernes) requiere abrir
`ClassFormModal` una vez por día, a mano. El pedido: simplificar
visualmente la vista (vista semanal tipo calendario en vez de tabla) y
permitir crear varias clases de una sola vez eligiendo días de la semana,
sin construir un sistema de horarios recurrentes — es una herramienta de
creación rápida; cada clase generada queda como fila independiente,
editable individualmente después (confirmado por el usuario: "quiero crear
una clase de 10am y que se repita X días, para después decidir si va a
editar algo").

No existe ninguna validación de solapamiento/disponibilidad hoy en el
camino de creación de clases (`ClassFormModal` solo valida
`endsAt > startsAt`; `classesService.createClass` hace un insert plano sin
consultar clases existentes). `studio_classes` no tiene columnas de
día-de-semana ni recurrencia, solo `starts_at`/`ends_at` concretos — se
mantiene así, no se agrega recurrencia a la base de datos.

## Alcance

**Incluye:**
1. Vista semanal en grid (Domingo a Sábado, 7 columnas) reemplazando la
   tabla en `ClassesPage`.
2. Navegación por semana (`WeekSelector`, prev/next/"Hoy"), reemplaza los
   filtros de fecha manual.
3. Filtro de instructor (único filtro que queda; se elimina el filtro de
   estado).
4. Click en una clase de la grilla abre `ClassFormModal` en modo edición
   (sin cambios de comportamiento ahí).
5. `ClassFormModal` en modo creación gana selector de días (Dom-Sáb) +
   input "Repetir N semanas", genera múltiples clases de una vez.
6. Validación de disponibilidad: una clase nueva no se crea si ya existe
   otra clase (`SCHEDULED`, de cualquier instructor) que se solape con esa
   fecha/hora exacta. Las ocurrencias en conflicto se saltan, el resto se
   crea, se informa cuáles se saltearon.

**No incluye:**
- Concepto de "clase recurrente"/plantilla en la base de datos — cada
  ocurrencia generada es una fila normal de `studio_classes`, sin vínculo
  entre sí. Editar una no afecta a las demás.
- Chequeo de disponibilidad por instructor específico (se decidió: el
  choque es por horario exacto, sin importar instructor — ver "Decisiones
  pendientes" en `docs/roadmap.md` si esto cambia).
- Cambios a `ClassesTable`/tabla como vista alternativa — se reemplaza,
  no se agrega un toggle tabla/grid (YAGNI, nadie lo pidió).
- El botón "Crear clase" no cambia de lugar ni de disparador, solo el
  modal que abre gana los campos nuevos.

## Semana: Domingo a Sábado

Convención `day_of_week` 0-6 con 0 = Domingo, igual que
`academy_group_schedules.day_of_week` (`DAY_LABELS` en
`AcademyGroupFormModal.tsx`) — se reutiliza la misma convención ya
establecida en el código, no una nueva. Nota: esto difiere del
`getWeekStart` de `apps/web` (que arranca semana en Lunes, ISO); son
utils independientes por app (mismo patrón de duplicación que ya existe
entre `apps/web`/`apps/admin` para auth/`supabaseClient`), no se comparte
código entre ambas.

## Frontend

### `apps/admin/src/features/classes/utils/weekUtils.ts` (nuevo)

```ts
export function getWeekStart(date: Date): Date // retrocede al Domingo anterior (o el mismo dia si ya es Domingo)
export function getWeekLabel(weekStart: Date): string // "D mmm – D mmm"
export function getWeekDays(weekStart: Date): Date[] // 7 fechas, Domingo a Sabado
```

### `WeekSelector.tsx` (nuevo, adaptado de `apps/web`)

Igual forma que el de `apps/web`: flechas prev/next (saltan 7 días),
botón "Hoy" (solo visible si no estás en la semana actual), label de
rango. Controlado: `{ selectedWeekStart, onChange }`.

### `ClassesWeekGrid.tsx` (nuevo, reemplaza `ClassesTable` en `ClassesPage`)

Recibe `classes` (ya filtradas por semana + instructor desde `useClasses`)
e `instructors`. Agrupa por día (Domingo-Sábado) en 7 columnas, dentro de
cada columna ordena por `starts_at` ascendente. Cada tarjeta: título,
horario (`HH:mm`–`HH:mm`), instructor, cupo (`maxCapacity`). Click abre
`ClassFormModal` en modo edición (mismo flujo que hoy tenía el click de
fila en `ClassesTable`).

### `ClassFiltersBar.tsx` (simplificado)

Se elimina `status`, `dateFrom`, `dateTo`. Queda solo el `<select>` de
instructor. `ClassesPage` deriva `dateFrom`/`dateTo` internamente desde
`weekStart` (mismo patrón que `ClassesCalendarPage` en `apps/web`), no
pasa por el filtro bar.

### `ClassFormModal.tsx` (extendido, solo en modo creación)

Nuevos campos, visibles solo cuando `mode === 'create'` (en edición no
aparecen — editar sigue siendo de una sola clase, sin cambios):
- `weekdays: number[]` — checkboxes Dom-Sáb, día actual pre-marcado por
  default. Mínimo 1 seleccionado (validación Zod).
- `weeksCount: number` — input numérico, default `1` (con default 1 y
  solo el día actual marcado, el comportamiento es idéntico al de hoy:
  una sola clase). Entero positivo, tope razonable `52` (evita lotes
  absurdos por error de tipeo).

Zod schema gana:
```ts
weekdays: z.array(z.number().int().min(0).max(6)).min(1),
weeksCount: z.coerce.number().int().positive().max(52),
```

Al enviar, en vez de `createClass` llama a `classesService.createClasses`
(ver abajo). Si `result.skipped.length > 0`, muestra un resumen inline
("Se crearon 11 de 12. Se salteó: Miércoles 16-sep 6:00 (ya existe una
clase en ese horario)") en vez de cerrar el modal en silencio; si
`skipped` está vacío, cierra como hoy.

## Servicios

### `classesService.ts`

Nueva función, reemplaza el uso de `createClass` desde `ClassFormModal`
(la función singular puede quedar sin uso o eliminarse si nada más la
llama — a confirmar durante implementación revisando otros callers):

```ts
export async function createClasses(
  businessId: string,
  input: {
    instructorId: string;
    title: string;
    weekdays: number[];       // 0=Domingo .. 6=Sabado
    startTime: string;        // "HH:mm"
    endTime: string;          // "HH:mm"
    maxCapacity: number;
    weekStart: Date;          // Domingo de la semana visible al momento de crear
    weeksCount: number;
  }
): Promise<{
  created: StudioClass[];
  skipped: { startsAt: string; reason: string }[];
}> {
  // 1. Expandir weekdays x weeksCount a pares {startsAt, endsAt} concretos
  //    (weekStart + semana*7 + offset al weekday, + startTime/endTime).
  // 2. Un solo select a studio_classes (status != CANCELLED) acotado al
  //    rango completo del lote, para detectar solapamientos.
  // 3. Filtrar los slots generados que se solapen con algo existente.
  // 4. Un solo insert (batch) con los slots restantes.
  // 5. Devolver { created, skipped } para que el modal arme el mensaje.
}
```

Sin RPC nueva, sin migración — decisión explícita del usuario dado el bajo
volumen de uso concurrente (1-2 admins). Si en el futuro hace falta
atomicidad real (creación concurrente frecuente), subir esto a una función
`security definer` en Postgres, mismo patrón que `book_class`/
`cancel_booking` (`supabase/migrations/011_bookings.sql`).

## Manejo de errores

- Conflictos de horario: no son un error, son un resultado parcial
  esperado — se muestran como aviso informativo, no bloquean el resto del
  lote.
- Errores reales de Supabase (RLS, constraint): mismo patrón ya usado en
  el resto de `apps/admin` (`getErrorMessage`/`mapSaveError`).

## Testing

Sin infraestructura de tests automatizados en `apps/admin` hoy (mismo
patrón que el resto del proyecto: verificación manual en navegador +
typecheck/lint/build). Checklist manual:

1. Grid semanal muestra 7 columnas Domingo-Sábado, clases ordenadas por
   hora dentro de cada columna.
2. `WeekSelector`: prev/next mueve 7 días, "Hoy" vuelve a la semana
   actual y desaparece cuando ya estás en ella.
3. Filtro de instructor sigue funcionando sobre la grilla.
4. Click en una clase abre `ClassFormModal` en edición, guarda como hoy.
5. Crear clase con 1 solo día marcado (el actual) y semanas=1 -> crea 1
   clase, comportamiento igual al actual.
6. Crear clase con 3 días marcados x 4 semanas -> crea 12 clases (o
   menos si hay conflictos), aparecen en las columnas/semanas correctas
   al navegar.
7. Crear un lote donde una ocurrencia choca con una clase ya existente en
   ese horario exacto -> esa ocurrencia se saltea, el resto se crea, se
   muestra el aviso con el detalle de lo salteado.
8. `npm run typecheck && npm run lint && npm run build` en `apps/admin`
   sin errores.

## Fuera de alcance

- Toggle tabla/grid.
- Recurrencia real (plantilla + generación automática futura, edición en
  cadena).
- Chequeo de disponibilidad por instructor (solo por horario exacto,
  cualquier instructor).
- RPC atómica en Postgres (queda documentada como upgrade path, no se
  construye ahora).
- Vista de Paquetes en admin (sub-proyecto aparte, bounded, sin spec —
  reskin directo de `PackagesTable` a grid de tarjetas estilo
  `PackageCard` de `apps/web`, mismo `usePackages()`/`PackageFormModal`).
