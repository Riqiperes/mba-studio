# Reglas de negocio

Este documento es la referencia de las reglas de negocio criticas. Toda
regla aqui descrita debe estar protegida tanto en frontend (UX) como en
backend/base de datos (verdad), nunca solo en frontend.

## Studio — creditos y paquetes

```
Compra de paquete -> Pago confirmado (webhook Stripe) -> Creditos otorgados
Reservacion de clase -> Credito consumido
Cancelacion valida -> Credito devuelto
```

- Un paquete otorga N creditos al confirmarse el pago (nunca antes).
- Reservar una clase consume 1 credito (o el valor que defina el paquete/clase).
- Cancelar una reservacion segun las reglas de cancelacion (ver abajo)
  devuelve el credito consumido.
- Los creditos pueden expirar segun la vigencia del paquete (a definir el
  valor exacto por paquete en `packages.expires_at` o similar).

## Reservaciones

Un usuario puede reservar una clase solo si:

- Tiene al menos 1 credito disponible.
- La clase existe, no esta cancelada, y su fecha/hora no paso.
- No tiene ya una reservacion activa para esa misma clase (anti duplicado).
- Hay cupo (capacidad no excedida).

Si no hay cupo, el usuario puede unirse a la lista de espera en vez de
reservar.

## Cancelacion de reservaciones

- Reglas exactas de ventana de cancelacion (ej. "hasta N horas antes de la
  clase") quedan pendientes de definir con el negocio real; hasta entonces,
  documentar aqui el valor acordado antes de implementarlo.
- Una cancelacion fuera de la ventana permitida puede no devolver el
  credito (a definir).

## Lista de espera

- Orden determinista tipo FIFO (`created_at` de la entrada en waitlist).
- Si se libera un cupo (cancelacion de otro usuario), el siguiente en la
  lista es notificado (ver `docs/notifications.md`) y tiene una ventana de
  tiempo para confirmar antes de pasar al siguiente (valor de la ventana a
  definir).

## Capacidad de clase

- Toda clase tiene `max_capacity`. El booking numero `max_capacity + 1`
  debe rechazarse a nivel de base de datos, no solo de UI.

## Academia — colegiaturas

```
Inscripcion -> Estado ACTIVA
Colegiatura vencida sin pago -> Alerta de pago atrasado
Falta de pago sostenida / solicitud del alumno -> Baja
```

- Toda inscripcion tiene una fecha limite de pago por periodo.
- Pasada la fecha limite sin pago registrado, se genera una alerta de pago
  atrasado (ver `docs/notifications.md`).
- Una baja cambia el estado de la inscripcion y detiene las alertas futuras
  de esa inscripcion.

## Pagos (ver tambien docs/payments.md)

- El unico evento que confirma un pago es el webhook de Stripe verificado
  por firma. Un `payment_success` enviado por el frontend nunca se confia.
- Los webhooks deben ser idempotentes: un evento repetido no debe otorgar
  creditos ni marcar el pago dos veces.

## Notas

Los valores numericos exactos (ventana de cancelacion, ventana de
confirmacion de waitlist, dias de gracia antes de "pago atrasado") no estan
definidos todavia porque dependen de decisiones del negocio real. Cuando se
definan, actualizar este documento en el mismo cambio que se implementen.
