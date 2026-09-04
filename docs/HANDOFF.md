# Handoff — 2026-09-04

## Rama actual

`develop`, limpia, al día con origin (`7164024`). Dos ramas de feature
abiertas en PR, ninguna mergeada todavía.

## Qué se hizo esta sesión

### PR #13 — `feat/whatsapp-notifications-scaffold` → `develop`

Primeras Edge Functions reales del repo (`supabase/functions/` solo tenía
READMEs stub hasta ahora). Interfaz `WhatsAppProvider` +
`MockWhatsAppProvider` + `getWhatsAppProvider()` (selecciona por
`WHATSAPP_PROVIDER`) en `supabase/functions/_shared/whatsapp/`. Edge
Function `send-whatsapp` (valida body, requiere `Authorization: Bearer
<service role key>`, delega al provider activo). Edge Function
`notifications` (valida el tipo de evento contra `templates.ts`, despacha
a `send-whatsapp`). Proveedores reales (`meta`/`twilio`/`ultramsg`) lanzan
error explícito "aún no implementado" — pendiente decisión de negocio.

Deno CLI no estaba instalado en el entorno; se instaló (winget) durante la
sesión para poder correr `deno test`/`deno check` — ambos en verde.

**Pendiente:** decisión de negocio sobre proveedor real, deploy a
Supabase, prueba en vivo. Nadie llama a `notifications/` todavía (el botón
"Enviar recordatorio" de waitlist sigue pospuesto hasta esto, ver punto 7
del handoff anterior — sigue vigente).

### PR #14 — `feat/admin-classes-week-view` → `develop`

Rediseño de `ClassesPage` (admin): tabla plana → grilla semanal
Domingo-Sábado (`ClassesWeekGrid`), `WeekSelector` para navegar semanas,
filtro simplificado a solo instructor. `ClassFormModal` en modo creación
gana selector de días + "repetir N semanas" para crear varias clases de
una vez (`classesService.createClasses`, 100% client-side, sin
RPC/migración nueva — decisión explícita del usuario dado bajo volumen de
uso concurrente). Una clase nueva no se crea si ya existe otra
`SCHEDULED` en ese horario exacto (cualquier instructor); las que chocan
se saltean y se avisan, el resto se crea.

Proceso: `superpowers:brainstorming` → spec
(`docs/superpowers/specs/2026-09-03-admin-classes-week-view-bulk-create-design.md`)
→ plan de 9 tasks
(`docs/superpowers/plans/2026-09-03-admin-classes-week-view-bulk-create.md`)
→ `superpowers:subagent-driven-development` (un subagente + review por
task, las 8 tasks de código aprobadas) → review final de toda la rama
(modelo más capaz) → encontró un bug real: `listClasses` comparaba fechas
locales (`YYYY-MM-DD`) contra `starts_at` dejando que Postgres casteara el
límite a medianoche **UTC**, mientras la grilla agrupa por fecha **local**
— clases de sábado ≥18:00 (hora CDMX) desaparecían de la grilla semanal y
podían duplicarse al crear un lote que cruzara esa fecha. Un solo fix
(`localDayStartIso`), más 3 hallazgos menores (filtro de conflicto debía
ser `SCHEDULED` no `!= CANCELLED`, mensaje de salteo sin conteo de
creadas, tipo `UpdateClassInput` triplicado) — todo corregido en un único
commit de fix, re-review de alcance limitado confirmó todo resuelto.

**QA manual completa en navegador, contra el proyecto de Supabase real**
(`eazyblybekyygimqpjjw`, dev/staging compartido): los 10 pasos del
checklist del plan — grilla, `WeekSelector` (prev/next/Hoy), filtro
instructor, click-a-detalle, crear clase simple, crear en lote (2 días x 2
semanas, detectó correctamente conflictos contra clases creadas en
submits previos de la misma sesión de QA), editar, cancelar — todos
verificados en vivo. Datos de prueba creados y cancelados al terminar
(limpieza, no quedó basura en la BD compartida). Sin hallazgos nuevos.

Nota de tooling (no es bug de la app): la herramienta de automatización de
navegador (`claude-in-chrome`'s `form_input`) no dispara el evento de
React de forma confiable sobre checkboxes controlados — el primer intento
de marcar "Sábado" no tomó efecto pese a reportar éxito. Un click real de
mouse sobre el checkbox sí funcionó siempre. Si una futura sesión de QA ve
un checkbox que "no responde" a `form_input`, usar click real en su lugar
antes de sospechar de la app.

## Estado del repo

```
Rama develop: limpia, al día con origin, HEAD 7164024.
PR #13 (feat/whatsapp-notifications-scaffold): abierto, sin mergear, mergeable.
PR #14 (feat/admin-classes-week-view): abierto, sin mergear, mergeable, QA manual completa.
Worktrees activos: .claude/worktrees/whatsapp-notifications-scaffold,
                    .claude/worktrees/admin-classes-week-view
```

## Siguiente paso sugerido

1. **Revisar y mergear PR #13 y PR #14** — ambos listos para revisión
   humana, ninguno afecta producción hasta que se mergeen a `develop`.
2. Después de mergear #14: sub-proyecto hermano ya diseñado y aprobado en
   brainstorming pero sin implementar — **Paquetes admin**: reskin de
   `PackagesTable` (admin) a grid de tarjetas estilo `PackageCard` de
   `apps/web` (mismo layout visual), con click-to-edit en toda la tarjeta
   + pill Activo/Inactivo + botón Desactivar/Activar en el footer. Mismo
   `usePackages()`/`PackageFormModal`, sin cambios de datos — bounded,
   sin spec propio, directo a implementación cuando se retome.
3. Decisión de negocio pendiente (bloquea el proveedor real de WhatsApp,
   no bloquea nada más): Meta / Twilio / UltraMsg.
4. Recordatorio lista espera (waitlist): sigue pospuesto a propósito
   hasta integración real de WhatsApp (PR #13 mergeado + proveedor real).
5. Dar `SUPER_ADMIN` a prima del usuario: mecanismo listo
   (`admin_allowed_emails`), falta que el usuario dé el correo.

## Notas / bloqueos

Ninguno técnico. `docs/HANDOFF.md` previo (2026-09-02) quedó desactualizado
en el checkout principal como diff sin commitear entre dos sesiones — este
archivo lo reemplaza limpio, sin arrastrar esa discrepancia.
