# Preguntas para la dueña del negocio

Cosas que el desarrollo simplificó "por ahora" porque no hay una regla de
negocio definida, o decisiones ya tomadas que vale la pena revalidar con
uso real. Cuando se responda una, documentar el valor acordado en
`docs/business-rules.md` (y quitarla de aquí) en el mismo cambio que se
implemente.

## Decisiones ya tomadas (implementadas)

1. **Ventana de cancelación de reservación (Studio):** **12 horas antes** de la clase para recuperar credito. Despues de esa ventana o no-show: se cobra el credito. Creditos expiran mensualmente (reset dia 1).

2. **Lista de espera (Studio):** **Solo recordatorio manual**. Boton "Enviar notificacion" en admin cuando hay cupo. Sin cola FIFO automatizada, sin prioridad. El cliente reserva manualmente si hay cupo.

3. **Registro de pagos en efectivo/transferencia:** Nota libre basta por ahora. Folio/referencia opcional.

4. **Creditos por clase:** **1 credito fijo** por clase. Sin clases multi-credito por ahora.

5. **Vigencia de paquetes / expiracion de creditos:** **Reset mensual automatico** (dia 1). Creditos no usados no se acumulan mes a mes.

6. **Quien reserva las clases:** **Cliente reserva su propia clase** desde la web (`apps/web`). Staff puede reservar/cancelar desde admin.

7. **Catalogo publico:** **Si, abierto al publico** sin login (precios, paquetes, calendario, horarios). Login solo para reservar/ver perfil.

8. **Email del cliente en admin:** No visible por ahora. Solo nombre y telefono.

9. **Alumno con cuenta propia:** No por ahora. Titular gestiona todo.

10. **Proveedor de notificaciones:** Pendiente (WhatsApp/email mock por ahora).

11. **Fechas de cobro de colegiatura (Academia):** **Primeros 10 dias del mes** (dia 10 corte). Fecha fija global, no aniversario.

12. **Cupo maximo por grupo de Academia:** **Max 15** (recomendado 12). Configurable por grupo.

13. **Informacion adicional por grupo de Academia:** **Edad minima/maxima** (campos `age_min`, `age_max`). Sin salon/ubicación ni cuota especifica por grupo por ahora.

## Nuevas decisiones por validar

14. **Descuentos por referido (Academia):** Campo `discount_percent` en perfil de cliente. Aplicable solo a ballet. ¿Qué rango de porcentaje permitido? (ej. 0-50%)

15. **Campos medicos de cliente:** Condiciones (embarazo, hernia, etc.), edad, notas. ¿Obligatorio o solo opcional? ¿Visible para instructor en lista de alumnos?

16. **Rol INSTRUCTOR_ADMIN:** Permisos exactos — ver solo sus clases y alumnos. No acceso a paquetes, creditos globales, clientes de otros instructores, configuracion. ¿Algo mas restringir?

17. **Cuenta de instructor obligatoria:** Recomendada pero no obligatoria. ¿Como manejar instructores sin cuenta Auth en "Mis clases" y filtros?

18. **Proveedor WhatsApp/Email definitivo:** Para notificaciones reales (recordatorio lista de espera, alerta colegiatura, etc.)

19. **Reset mensual de creditos:** Dia 1 de cada mes. ¿Que pasa con creditos comprados dia 28? ¿Se pierden dia 1 siguiente o duran mes completo? (Definicion: creditos comprados duran hasta fin del mes calendario actual, reset dia 1 siguiente).

## Pendientes de Stripe/Pagos

20. Stripe Checkout + Webhook para compra de paquetes.
21. Idempotencia de webhooks.
22. Historial de pagos (cliente y admin).