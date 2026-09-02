# Roadmap

Orden recomendado de construccion incremental. Cada etapa debe dejar el
proyecto funcionando (build verde) antes de pasar a la siguiente.

1. Repository — hecho (repo Git conectado a GitHub).
2. Project configuration — **en progreso**: scaffolding del monorepo,
   `CLAUDE.md`, `docs/`, configuracion base de TypeScript/ESLint/Tailwind.
3. Supabase — crear proyecto, configurar Auth, obtener URL/anon key.
4. Database — primeras migraciones (`business`, `profiles`, `instructors`,
   `studio_classes`, `packages`).
5. RLS — policies para las tablas anteriores.
6. Authentication — email/password + proteccion de rutas.
7. Google OAuth — "Continuar con Google".
8. Base UI — layouts, navegacion, componentes compartidos minimos.
9. Studio packages — CRUD de paquetes (admin) + catalogo (cliente).
10. Studio classes — CRUD de clases (admin) + calendario (cliente).
11. Bookings — reservar/cancelar clase.
12. Credits — otorgar/consumir/devolver creditos, ligado a bookings y
    payments.
13. Waitlist — lista de espera con orden determinista.
14. Stripe — Checkout + Webhook + idempotencia.
15. Payments — historial de pagos (cliente y admin).
16. User dashboard — perfil, creditos, proximas clases, historial.
17. Admin dashboard — metricas generales.
18. Academy — dividido en sub-proyectos, mismo patron que Bookings/Credits/
    Waitlist:
    18a. Grupos + Inscripciones — CRUD de grupos (nombre, instructor
         opcional, horario semanal con varios dias/horas), inscribir/dar
         de baja Alumnos existentes (`dependents`) a un grupo. El cliente
         debe tener cuenta ya creada (flujo de Clientes existente).
         **Cupo maximo por grupo: 15 (recomendado 12), grupos por edad.**
    18b. Clientes sin cuenta ("clientes de mostrador") — permite inscribir
         a un Alumno cuyo tutor no quiere/no tiene cuenta (paga en
         efectivo, nunca inicia sesion). Requiere relajar
         `dependents.guardian_id` (hoy FK obligatoria a `profiles`) para
         aceptar un guardian ligero sin login (nombre/alias/telefono para
         WhatsApp). Afecta tambien al Studio, no solo a Academia -- ver
         `docs/preguntas-para-negocio.md` item 3 (registro de pagos en
         efectivo).
    18c. Colegiaturas — **pago en primeros 10 dias del mes**, estado
         `PAGADO`/`NO_PAGADO` por periodo de inscripcion (sin Stripe
         todavia), que el staff marca manualmente al cobrar en
         efectivo/transferencia; alertas de pago atrasado
         (ver `docs/business-rules.md`).
    18d. Descuentos por referido — campo de descuento personalizado
         en perfil de cliente (admin), aplicable a clases de ballet.

> **Nota:** El sub-proyecto 18e (Asistencia — registro de asistencia por
> sesión de grupo) fue descartado por orden de la directora. No se
> implementará ninguna funcionalidad de asistencia en la Academia.

19. **Politicas de cancelacion y creditos (Studio):**
    - Ventana de 12 horas antes de la clase para cancelar y recuperar credito.
    - Cancelacion despues de la ventana o no-show: se cobra el credito.
    - Creditos expiran mensualmente (reset el dia 1 de cada mes).
20. **Lista de espera (Studio):** boton "Enviar notificacion" (recordatorio
    manual cuando hay cupo), **sin cola de prioridad** — solo recordatorio.
21. Notifications — generacion de eventos de notificacion (email primero).
22. WhatsApp — proveedor real (Meta/Twilio/UltraMsg) detras de la
    abstraccion ya preparada.
23. White-label configuration — tabla `business` consumida por la UI (ver
    `docs/white-label.md`).
24. **Campos personalizados de cliente:** condiciones medicas (embarazo,
    hernia, etc.), edad, notas — visibles en admin y detalle de clase.
25. **Instructores como admin limitado:** rol `INSTRUCTOR_ADMIN` (no
    SUPER_ADMIN) — vista "Mis clases" con sus alumnos, filtro por
    instructor en admin. Cuenta recomendada pero no obligatoria.
26. **Acceso publico web:** toda la informacion visible sin login
    (precios, paquetes, calendario, horarios). Login solo en perfil.
27. Testing — tests de las reglas criticas listadas en `docs/testing.md`.
28. Deployment — Cloudflare Pages + Supabase produccion (ver
    `docs/deployment.md`).
29. Documentation — mantener `docs/` y `CLAUDE.md` al dia con lo
    implementado.
30. Recovery verification — validar que `docs/PROJECT_RECOVERY.md` funciona
    de verdad clonando en un entorno limpio.

## Decisiones pendientes (no implementar hasta decidir con el negocio)

- Ventana de confirmacion al liberarse un cupo en lista de espera (solo recordatorio manual).
- Proveedor de WhatsApp definitivo (Meta / Twilio / UltraMsg) para
  produccion.
- Proveedor de email definitivo.

Cuando se decidan, documentar el valor en `docs/business-rules.md` en el
mismo cambio que se implemente.

## Deuda tecnica conocida

- **`mapSaveError`/`err instanceof Error` no detecta errores de Supabase**:
  `ClassFormModal.tsx`, `InstructorFormModal.tsx`, `DependentFormModal.tsx`
  y `PackageFormModal.tsx` usan `err instanceof Error ? err.message : ...`
  para clasificar errores de guardado (RLS, constraint, etc.). Se
  verifico en vivo (sesion 2026-08-30, verificacion manual de
  reservaciones+lista de espera) que un error de `supabase.rpc()`/
  `.from()` es un objeto plano en runtime, no una instancia real de
  `Error`, asi que esa condicion siempre es falsa y el mensaje cae al
  generico ("No se pudo guardar. Intenta de nuevo.") en vez de
  distinguir permiso vs validacion vs desconocido. La feature de
  reservaciones/creditos (`apps/admin/src/utils/getErrorMessage.ts`)
  ya usa un chequeo por duck-typing que si funciona; aplicar el mismo
  fix a `mapSaveError` en los 4 modales de arriba cuando se toque esa
  area de nuevo (no se incluyo en el fix de reservaciones para no
  ampliar el diff de un plan ya cerrado).