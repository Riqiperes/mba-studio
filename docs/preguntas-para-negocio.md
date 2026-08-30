# Preguntas para la dueña del negocio

Cosas que el desarrollo simplificó "por ahora" porque no hay una regla de
negocio definida, o decisiones ya tomadas que vale la pena revalidar con
uso real. Cuando se responda una, documentar el valor acordado en
`docs/business-rules.md` (y quitarla de aquí) en el mismo cambio que se
implemente.

## Bloquean una regla de negocio real (urgente resolver)

1. **Ventana de cancelación de reservación.** Hoy: cancelar siempre
   devuelve el crédito, sin importar qué tan cerca esté la clase.
   Pregunta: ¿hasta cuántas horas antes de la clase se puede cancelar y
   aun así recuperar el crédito? ¿O prefieren que sea siempre sin límite?

2. **Ventana de confirmación en lista de espera.** Hoy: cuando se libera
   un cupo, el staff mueve manualmente a la siguiente persona de la lista
   a la reservación — no hay ventana de tiempo automática (necesitaría
   notificaciones funcionando, ver punto 10). Pregunta: cuando se
   automatice, ¿cuánto tiempo debe tener esa persona para confirmar antes
   de pasarle al que sigue en la fila?

3. **Registro de pagos en efectivo/transferencia.** Hoy: el staff puede
   otorgar créditos manualmente desde el panel, guardando solo una nota
   libre. Pregunta: cuando alguien paga en efectivo o transferencia en el
   estudio (no con tarjeta por Stripe), ¿necesitan guardar un
   folio/referencia de ese pago, o con la nota libre basta?

4. **Créditos por clase.** Hoy: toda clase consume exactamente 1 crédito.
   Pregunta: ¿existe o van a existir clases especiales (talleres, clases
   dobles) que cuesten más de 1 crédito?

5. **Vigencia de paquetes.** Hoy: el paquete tiene un campo "vigencia en
   días" pero los créditos sobrantes nunca expiran automáticamente al
   vencer. Pregunta: cuando un paquete vence, ¿los créditos que sobraron
   se pierden solos, o lo manejan caso por caso con cada cliente?

## Decisiones ya tomadas, vale la pena confirmar con uso real

6. **Quién reserva las clases.** Hoy: solo el staff reserva/cancela desde
   el panel, a nombre del cliente (por teléfono o en el mostrador). El
   cliente todavía no puede reservar su propia clase desde la app.
   Pregunta: ¿así es como reciben reservaciones hoy en la práctica, o los
   clientes ya esperan poder reservar ellos mismos?

7. **Catálogo público.** Hoy: cualquier persona sin cuenta puede ver la
   lista de instructores y clases (pensado como catálogo/marketing).
   Pregunta: ¿de verdad quieren ese catálogo abierto al público, o
   debería requerir una cuenta?

8. **Email del cliente no visible en el panel de admin.** Hoy: el
   directorio de clientes solo muestra nombre y teléfono. Pregunta: ¿el
   staff necesita buscar o ver el email del cliente en el día a día?

9. **Un alumno (hijo) nunca tiene su propia cuenta.** Hoy: el titular de
   la cuenta es siempre quien paga y gestiona; el alumno (ej. un hijo
   inscrito en Ballet) no puede iniciar sesión por su cuenta. Pregunta:
   ¿algún alumno necesitaría acceso propio en algún momento (por ejemplo
   al cumplir 18 años, o para ver su propio horario)?

10. **Proveedor real de notificaciones.** Hoy: WhatsApp/email corren con
    un proveedor de prueba (mock), nada se envía de verdad todavía.
    Pregunta: ¿qué canal usan hoy para avisar a clientes (WhatsApp,
    email, SMS) y con qué proveedor quieren operar en producción (Meta
    WhatsApp API, Twilio, UltraMsg, etc.)?
