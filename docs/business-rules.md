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
- **Los creditos expiran mensualmente: reset automatico el dia 1 de cada mes
  (creditos no usados no se acumulan).**

## Reservaciones

Un usuario puede reservar una clase solo si:

- Tiene al menos 1 credito disponible.
- La clase existe, no esta cancelada, y su fecha/hora no paso.
- No tiene ya una reservacion activa para esa misma clase (anti duplicado).
- Hay cupo (capacidad no excedida).

Si no hay cupo, el usuario puede unirse a la lista de espera en vez de
reservar.

## Cancelacion de reservaciones (Studio)

- **Ventana de 12 horas antes del inicio de la clase** para cancelar y
  recuperar el credito.
- Cancelacion dentro de las 12 horas previas a la clase, o no-show:
  **se cobra el credito** (no se devuelve).
- La cancelacion la puede hacer el cliente (web) o el staff (admin).

## Lista de espera (Studio)

- **Sin cola de prioridad FIFO automatizada**. La lista de espera es solo
  informativa.
- Cuando la clase tiene cupo disponible, el staff (admin) ve un boton
  **"Enviar notificacion"** que envia un recordatorio manual (WhatsApp/email)
  a los clientes en lista de espera.
- El recordatorio **no reserva automaticamente** ni da prioridad; el cliente
  debe entrar a la web y reservar manualmente si hay cupo.

## Capacidad de clase

- Toda clase tiene `max_capacity`. El booking numero `max_capacity + 1`
  debe rechazarse a nivel de base de datos, no solo de UI.

## Academia — colegiaturas

```
Inscripcion -> Estado ACTIVA
Colegiatura vencida sin pago -> Alerta de pago atrasado
Falta de pago sostenida / solicitud del alumno -> Baja
```

- Toda inscripcion genera una colegiatura mensual.
- **Fecha limite de pago: dia 10 de cada mes** (primeros 10 dias del mes).
- Pasado el dia 10 sin pago registrado, se genera alerta de pago atrasado.
- Una baja cambia el estado de la inscripcion y detiene las alertas futuras.

## Descuentos por referido (Academia - Ballet)

- El admin puede asignar un **descuento personalizado (%)** en el perfil
  del cliente (campo `discount_percent`).
- Aplicable solo a clases de ballet/grupos de academia.
- Se aplica al calcular la colegiatura mensual.

## Campos personalizados de cliente (Studio + Academia)

- **Condiciones medicas** (texto libre): embarazo, hernia, lesiones, etc.
- **Edad** (numero, opcional).
- **Notas adicionales** (texto libre).
- Visibles en: admin (detalle de cliente), detalle de clase/reservacion,
  lista de alumnos de instructor.

## Instructores como admin limitado

- Nuevo rol: `INSTRUCTOR_ADMIN` (distinto de `STAFF`, `BUSINESS_ADMIN`,
  `SUPER_ADMIN`).
- Permisos: ver sus clases asignadas ("Mis clases"), ver alumnos de sus
  clases, **no** puede gestionar paquetes, clientes globales, creditos,
  ni configuracion global.
- Cuenta de instructor **recomendada** pero no obligatoria (puede no
  tener cuenta Auth y seguir asignado a clases).
- En admin: filtro por instructor para ver sus clientes/clases.

## Academia — Grupos

- **Grupos por edad**: campo `age_min` / `age_max` (opcional).
- **Capacidad maxima**: 15 alumnos (recomendado 12). Campo `max_capacity`
  en `academy_groups` (default 15).
- Sin cupo maximo hardcoded en otras areas; configurable por grupo.

## Acceso publico (apps/web)

- **Toda la informacion visible sin login**: precios, paquetes, catalogo,
  calendario de clases, horarios, info de la academia.
- Login/registro solo necesario para: reservar clases, ver "Mi horario",
  editar perfil, ver creditos.
- Landing page (`/`) es publica; boton "Iniciar sesion" en navegacion.

## Pagos (ver tambien docs/payments.md)

- El unico evento que confirma un pago es el webhook de Stripe verificado
  por firma. Un `payment_success` enviado por el frontend nunca se confia.
- Los webhooks deben ser idempotentes: un evento repetido no debe otorgar
  creditos ni marcar el pago dos veces.

## Notas

Los valores numericos exactos (ventana de cancelacion 12h, reset mensual
dia 1, pago colegiatura dia 10, capacidad max 15) estan definidos aqui
y deben implementarse en el mismo cambio que se agreguen.