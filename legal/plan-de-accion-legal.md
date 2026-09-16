# Plan de acción legal — Políticas de privacidad, términos y cookies

Basado en la lectura de `docs/business-rules.md`, `docs/database.md`,
`docs/authentication.md`, `docs/payments.md`, `docs/whatsapp.md`,
`docs/notifications.md`, `docs/security.md`, `docs/white-label.md`,
`docs/roadmap.md`, `docs/preguntas-para-negocio.md`, `docs/deployment.md`,
`docs/CURRENT_STATE.md`, y en los datos fiscales, reglas operativas y
formularios de registro proporcionados directamente por la dueña del
negocio (2026-09-11). Este documento no sustituye asesoría legal
certificada: es el punto de partida para que un abogado redacte y valide
el texto final.

## Estado actual

Ya existe un **borrador final** de los 3 documentos principales:

- `legal/aviso-privacidad-integral.md`
- `legal/aviso-privacidad-simplificado.md`
- `legal/terminos-y-condiciones.md`

Cada uno tiene marcados `[PENDIENTE]` los puntos que faltan por resolver
antes de publicarse.

**Resuelto (2026-09-11):** la ventana de cancelación es de **8 horas**
(no 12) — corregida tanto en el sistema (migración
`supabase/migrations/029_cancel_booking_8h_window.sql`) como en
`docs/business-rules.md`, `docs/preguntas-para-negocio.md`,
`docs/roadmap.md` y `legal/terminos-y-condiciones.md`. El punto
`[BLOQUEANTE]` que tenían los Términos ya se quitó.

La Política de Cookies sigue sin redactarse: no hay tracking/analítica
activo todavía, se hace cuando se agregue.

## Datos fiscales y de contacto (confirmados)

**Corrección (2026-09-11):** hubo una confusión momentánea sobre si "la
prima" mencionada en una respuesta era una persona externa al negocio —
**se confirmó que la prima es `[NOMBRE_RESPONSABLE]`, la dueña**, no un
tercero. Sus datos sí son los correctos a usar.

**Nota de seguridad (2026-09-11):** los valores reales (nombre, RFC,
domicilio, correo) se sacaron de este archivo y de los 3 documentos en
`legal/` para no subirlos al repositorio. Viven únicamente en
`.env.local` (no versionado, ver `.gitignore`). Los tokens de abajo
(`[NOMBRE_RESPONSABLE]`, `[RFC_CLIENTE]`, `[DOMICILIO_FISCAL]`,
`[CORREO_CONTACTO]`) hay que sustituirlos a mano con esos valores reales
recién antes de publicar los documentos — no hay ningún mecanismo
automático en el proyecto que los reemplace.

- Titular: persona física con actividad empresarial — `[NOMBRE_RESPONSABLE]`
  (no es persona moral, "razón social" no aplica en sentido estricto).
- RFC: `[RFC_CLIENTE]`.
- Domicilio: `[DOMICILIO_FISCAL]` — **falta el código postal** (ver
  `.env.local`). Como el negocio es persona física, ella y "la academia"
  son la misma entidad legal: no existe un domicilio fiscal separado de
  la academia a menos que se registre formalmente un establecimiento
  aparte ante el SAT (trámite opcional, no obligatorio para el Aviso). Si
  `[DOMICILIO_FISCAL]` es el domicilio que tiene registrado en su
  Constancia de Situación Fiscal, **ya es válido para el Aviso**, solo
  falta el código postal. Si además quieren mostrar una dirección
  operativa distinta (dónde se dan las clases, si es diferente), eso es
  un dato opcional adicional, no un reemplazo del domicilio fiscal.
- Correo de contacto: `[CORREO_CONTACTO]`.
- Jurisdicción: México, Yucatán → aplica la LFPDPPP (Ley Federal de
  Protección de Datos Personales en Posesión de los Particulares).

## Reglas operativas confirmadas (fuente: dueña del negocio, 2026-09-11)

- **Registro**: solo el padre/madre/tutor legal puede inscribir a un
  alumno; se pide nombre y contacto de hasta 2 tutores. **No hay
  verificación de identidad del tutor** (es autodeclarado) — ver sección
  de datos sensibles abajo.
- **Cancelación Studio**: 8 horas antes de la clase, sin penalización.
  Después de esa ventana, o no-show, se cobra el crédito. **Resuelto**: el
  sistema usaba 12 horas; se corrigió con la migración
  `029_cancel_booking_8h_window.sql` para que coincida con la regla real.
- **Lista de espera**: se notifica a todos los inscritos simultáneamente;
  el cupo queda disponible para quien reserve primero. Ya coincide con lo
  implementado (sin cola FIFO).
- **Colegiaturas**: pago dentro de los primeros 10 días del mes; después,
  recargo del 10%. **Resuelto**: agregado a `docs/business-rules.md` y
  `docs/roadmap.md` (18c); todavía no está implementado en código (no hay
  lógica que lo calcule/aplique sobre `academy_payments`) — pendiente de
  desarrollo, no de documentación.
- **Reembolsos**: únicamente por imposibilidad de asistir de forma
  indefinida por motivos de salud. El reglamento general dice "no se
  realizan reembolsos" — se redactó como regla general + 1 excepción para
  evitar la contradicción. Falta definir el mecanismo exacto (total,
  prorateado, requiere constancia médica).
- **Fotos/video**: Academia pide autorización explícita Sí/No por alumno
  en el formulario de registro. El reglamento de Studio autoriza fotos/
  video de forma general, sin checkbox — recomendación: agregar el mismo
  Sí/No explícito también para clientas de Studio.
- Reglamentos de conducta, puntualidad, uniforme, cuidado de
  instalaciones, objetos perdidos, y modificación de horarios/precios:
  cubiertos y ya incorporados a `legal/terminos-y-condiciones.md`.

## Datos sensibles — evaluación para el Aviso de Privacidad

**Conclusión: sí, se necesita una sección dedicada y con consentimiento
expreso para "Datos Sensibles" (ya incluida en
`legal/aviso-privacidad-integral.md`, secciones 2.3 y 8).**

1. Condición médica, alergias y lesiones son **datos personales
   sensibles** bajo el artículo 3, fracción VI de la LFPDPPP (cualquier
   dato de salud entra en esta categoría, sin importar la edad del
   titular).
2. Conforme al artículo 9 de la LFPDPPP, tratar datos sensibles requiere
   **consentimiento expreso** — no basta el consentimiento tácito que sí
   aplica a datos no sensibles. Debe pedirse en un apartado separado y
   visible, no puede quedar implícito en la aceptación general del aviso.
   El formulario ya separa visualmente "Información médica relevante",
   pero le falta la casilla explícita de autorización.
3. Al ser datos de **menores de edad** (Academia), el consentimiento lo
   da el padre/madre/tutor legal; el Aviso declara expresamente que el
   tratamiento se basa en el interés superior del menor y su
   consentimiento.
4. **Gap operativo (no legal, sí de riesgo de negocio)**: el sistema no
   verifica que quien llena el formulario sea realmente el tutor legal —
   es autodeclarado. **Decisión de la dueña (2026-09-11): no se pide
   identificación oficial.** Se respalda únicamente con una declaración
   explícita "bajo protesta de decir verdad" que la persona debe leer y
   aceptar de forma separada (no un texto perdido dentro del reglamento),
   que traslada la responsabilidad de una mentira a quien la dijo. Ya
   redactada en `legal/terminos-y-condiciones.md` (sección 2) y en el
   Aviso Integral (sección 8). Falta implementarla como checkbox/firma
   real en el formulario físico o digital, no solo como texto legal.

## Cambios en la plataforma requeridos por las políticas

Todo lo decidido en esta conversación con la dueña ya está reflejado como
texto en `legal/aviso-privacidad-integral.md` / `legal/terminos-y-condiciones.md`,
o como regla de negocio en `docs/business-rules.md`. Esta sección es
distinta: junta, en un solo lugar, **qué hay que construir en la
plataforma** (`apps/web`, `apps/admin`, base de datos) para que esas
políticas se cumplan de verdad en la página, no solo en el papel. Es la
lista que se ejecuta cuando se diga "ejecuta el plan de acción".

### A. Casillas de consentimiento explícito nuevas (formularios)

1. **Aceptación de Aviso de Privacidad + Términos y Condiciones**
   - **Por qué**: el consentimiento debe ser un acto explícito y
     demostrable (Aviso Integral, sección 8), no algo implícito por usar
     la plataforma.
   - **Qué hacer**: checkbox sin marcar por defecto + enlaces a
     `/privacidad` y `/terminos`, que bloquee el envío del formulario si
     no está marcado. Aplica a: registro de cuenta nueva (`apps/web`,
     feature `auth`) y solicitud de inscripción de Academia
     (self-enrollment, feature `academy`).
   - **Estado**: no implementado; requiere que las páginas existan
     primero (ver punto D).

2. **Declaración del tutor** ("bajo protesta de decir verdad que soy
   padre/madre/tutor legal")
   - **Por qué**: hoy el campo de tutor es un dato pasivo (nombre y
     contacto); la decisión de la dueña fue no pedir identificación
     oficial sino respaldarse con una declaración explícita — pero eso
     solo respalda de verdad si la persona la ve y la acepta activamente,
     no si es un párrafo dentro de un reglamento largo que nadie lee.
   - **Qué hacer**: checkbox propio y obligatorio con ese texto exacto
     (ya redactado en `legal/terminos-y-condiciones.md`, sección 2), en
     el flujo de alta de un alumno (`dependents`): self-enrollment en
     `apps/web` y alta manual en `apps/admin`.
   - **Estado**: no implementado.

3. **Consentimiento expreso para datos sensibles de salud**
   - **Por qué**: la LFPDPPP exige consentimiento expreso (no tácito)
     para tratar datos sensibles, en un apartado separado del
     consentimiento general (Aviso Integral, secciones 2.3 y 8).
   - **Qué hacer**: checkbox distinto al de aceptación general,
     específico para autorizar el uso de la información médica que se
     está por llenar.
   - **Estado**: no implementado.

4. **Autorización Sí/No de fotos y video**
   - **Por qué**: ya existe en el formulario físico de Academia, pero
     hay que confirmar si existe también en el formulario digital
     (`dependents`); si no existe, hoy no hay forma de registrar ni de
     revocar esa autorización.
   - **Qué hacer**: campo Sí/No (no un checkbox único de "acepto todo")
     en el alta digital de alumno, editable después. Si se decide que
     Studio adopta lo mismo (pendiente en el Checklist), aplicar el
     mismo campo a clientes de Studio.
   - **Estado**: pendiente de confirmar si ya existe en código; si no,
     falta construirlo.

### B. Cambios de validación en campos que ya existen

5. **Campo médico obligatorio, pero "Ninguna" válido**
   - **Por qué**: decisión ya tomada — evitar un campo vacío ambiguo sin
     forzar a nadie a revelar una condición real que no tiene o no
     quiere compartir.
   - **Qué hacer**: cambiar la validación de `medical_conditions` de
     opcional a **requerido no vacío** (solo exige que tenga contenido;
     "Ninguna" pasa igual que una condición real).
   - **Estado**: no implementado — hoy es texto libre sin esta regla.

### C. Evidencia de aceptación (para poder demostrarla después)

6. **Guardar qué versión de cada documento aceptó cada persona, y cuándo**
   - **Por qué**: sin esto, no hay forma de demostrar que alguien aceptó
     el Aviso de Privacidad o los Términos si algún día hay un reclamo.
   - **Qué hacer**: definir con el equipo técnico dónde vive este dato
     (ej. tabla nueva `legal_acceptances` con `business_id`,
     `profile_id`, `dependent_id` opcional, tipo de documento, versión y
     fecha) — requiere una migración nueva.
   - **Estado**: no implementado (mismo punto que el paso 8 de "Plan de
     acción" más abajo).

### D. Publicación de los documentos

7. **Páginas públicas de las políticas**
   - **Por qué**: los checkboxes del punto A necesitan un enlace real a
     donde apuntar, y un cliente debe poder consultarlas sin pedirlas por
     correo.
   - **Qué hacer**: rutas nuevas en `apps/web` (`/privacidad`,
     `/terminos`, y `/cookies` cuando exista), enlazadas desde el footer.
   - **Estado**: no implementado.

### E. Reglas que los Términos ya declaran pero el sistema todavía no aplica

8. **Recargo del 10% por colegiatura tardía**
   - **Por qué**: los Términos ya lo declaran como regla vigente
     (confirmada por la dueña); si el sistema no lo cobra de verdad, el
     documento describiría algo que no pasa en la realidad — el mismo
     tipo de riesgo que tuvimos con la ventana de 8h/12h.
   - **Qué hacer**: agregar la lógica que calcule/aplique el recargo
     sobre `academy_payments` cuando el pago se registra después del día
     10 del mes.
   - **Estado**: no implementado (ver también `docs/roadmap.md`, 18c).

9. **Mecanismo de reembolso por salud** — bloqueado por una decisión de
   negocio pendiente (ver Checklist: "Definir la mecánica exacta del
   reembolso por salud"). Una vez definida, construir el flujo
   correspondiente (probablemente una acción manual de staff en
   `apps/admin`, tipo ajuste de crédito o baja con motivo).
   - **Estado**: bloqueado hasta tener esa definición.

## Checklist — información que falta pedir al cliente/negocio

**Datos legales y fiscales**
- [x] Razón social / nombre del titular — persona física: `[NOMBRE_RESPONSABLE]`
      (confirmado: ella es la dueña, no un tercero; valor real en `.env.local`).
- [x] RFC — `[RFC_CLIENTE]` (valor real en `.env.local`).
- [ ] Domicilio fiscal completo — falta el código postal; confirmar que
      `[DOMICILIO_FISCAL]` es el domicilio registrado en su Constancia de
      Situación Fiscal (ver nota arriba sobre por qué no hace falta un
      domicilio "de la academia" aparte).
- [x] País/estado donde opera — México, Yucatán → aplica LFPDPPP.
- [x] ¿Existe ya un Aviso de Privacidad previo (impreso, redes, etc.)? —
      No existe.

**Responsable de datos y contacto**
- [x] Nombre del responsable — `[NOMBRE_RESPONSABLE]` (valor real en `.env.local`).
- [x] Correo/teléfono oficial para derechos ARCO — `[CORREO_CONTACTO]`
      (no se dio teléfono, el correo basta como canal).

**Menores y datos sensibles**
- [x] ¿Se requiere identificación oficial del tutor, o basta la
      declaración autodeclarada actual? — **No se requiere
      identificación.** Basta la declaración autodeclarada, siempre que
      sea una declaración explícita y separada ("bajo protesta de decir
      verdad"), no un campo pasivo. Decisión de la dueña, 2026-09-11.
- [x] ¿Los campos médicos son obligatorios u opcionales? — **Obligatorio
      responder** (no se puede dejar en blanco), pero **"Ninguna"/"Sin
      condición"** es una respuesta válida cuando no aplica. Evita el
      riesgo de seguridad de un campo vacío ambiguo (¿no hay nada que
      reportar, o simplemente se les olvidó llenarlo?), sin forzar a
      nadie a confesar una condición real que no quiera compartir.
      Decisión, 2026-09-11 — ya reflejada en
      `legal/terminos-y-condiciones.md` y `docs/business-rules.md`.
- [x] ¿Quién tiene acceso a los campos médicos? — ya documentado en
      `docs/business-rules.md` ("Campos personalizados de cliente"):
      visible en admin, detalle de clase/reservación y lista de alumnos
      del instructor.

**Terceros**
- [ ] Proveedor de WhatsApp definitivo (Meta / Twilio / UltraMsg) — hoy
      solo hay un enlace `wa.me`, sin proveedor automatizado en
      producción.
- [ ] Proveedor de email transaccional definitivo.
- [ ] ¿Se planea agregar analítica web (Google Analytics, Meta Pixel,
      etc.)?

**Retención de datos**
- [x] Tiempo de conservación de datos de un cliente/alumno tras la baja —
      **1 mes**, después se elimina.
- [x] Tiempo de conservación de registros de pago — **5 años** (mínimo
      legal fiscal en México, CFF art. 30; se conservan por ese plazo
      aunque el cliente ya se haya dado de baja).

**Aprobación**
- [x] Quién aprueba/firma la versión final — `[NOMBRE_RESPONSABLE]`,
      dueña del negocio (confirmar explícitamente antes de
      publicar).

**Nuevos pendientes detectados con esta información**
- [x] Reconciliar la ventana de cancelación: 8 horas (dueña) vs. 12 horas
      (sistema implementado) — resuelto, 8 horas es la regla correcta,
      corregida en el sistema (migración `029`) y en toda la
      documentación.
- [ ] Definir la mecánica exacta del reembolso por salud (monto total o
      prorateado, si requiere constancia médica).
- [ ] Decidir si Studio también debe pedir autorización explícita Sí/No
      de fotos/video, igual que Academia.
- [x] Agregar a `docs/business-rules.md` el recargo del 10% por
      colegiatura tardía — hecho (también en `docs/roadmap.md`, 18c);
      falta implementarlo en código.

## Plan de acción

1. ~~Confirmar datos legales y jurisdicción~~ — hecho (ver arriba, con 2
   puntos pendientes de completar).
2. ~~Redactar Aviso de Privacidad Integral y Simplificado~~ — borrador
   listo, ver `legal/aviso-privacidad-integral.md` y
   `legal/aviso-privacidad-simplificado.md`.
3. ~~Redactar cláusula de consentimiento del tutor para datos de
   menores~~ — incluida dentro del Aviso Integral (sección 8) y de los
   Términos (sección 2), no como documento aparte.
4. ~~Redactar Términos y Condiciones~~ — borrador listo, ver
   `legal/terminos-y-condiciones.md` (tiene 1 punto `[BLOQUEANTE]`).
5. Redactar una Política de Cookies mínima — pendiente, no urgente (no
   hay tracking activo).
6. Tener los documentos revisados por un abogado antes de publicarlos.
7. Implementar los cambios de plataforma listados en "Cambios en la
   plataforma requeridos por las políticas" (arriba): páginas públicas,
   checkboxes de consentimiento, validación de campo médico, y evidencia
   de aceptación.
8. Actualizar `docs/CURRENT_STATE.md` y `docs/roadmap.md` una vez
   publicado, igual que cualquier otra funcionalidad.
