# White label / multi-tenant

## Alcance actual

El MVP es para **un solo negocio** (MBA MID). Este documento describe lo
que ya esta preparado en la arquitectura y lo que se deja explicitamente
para despues — no implementar lo de "despues" antes de que el MVP de un
solo negocio funcione bien.

## Preparado desde ya

- Toda tabla de negocio (`classes`, `packages`, `customers`, `bookings`,
  `payments`, `academy_enrollments`, etc.) tiene `business_id`. Ver
  `docs/database.md`.
- Tipo compartido `BusinessConfig` en `packages/shared/src/types/business.ts`
  con la forma que tendra la configuracion de negocio (nombre, logo,
  colores, telefono, WhatsApp, direccion, descripcion).
- Nada del negocio esta hardcodeado en componentes (ej. nunca escribir
  `"Studio Pilates XYZ"` directo en JSX): todo texto/branding especifico de
  negocio debe venir de configuracion, aunque hoy esa configuracion tenga
  un solo registro.
- Roles ya incluyen `SUPER_ADMIN`, pensado para administrar multiples
  negocios en el futuro, aunque hoy no haya UI para eso.

## Explicitamente fuera de alcance del MVP

- Multiples negocios funcionando en simultaneo.
- Dominios personalizados por negocio.
- Planes / facturacion SaaS.
- Panel de Super Admin para administrar varios negocios.
- Analytics multi-negocio.
- Onboarding self-service de nuevos negocios.

Estas funcionalidades se agregan cuando haya una razon de negocio real para
hacerlo, no antes. Ver `docs/roadmap.md`.

## Configuracion de negocio (single-tenant hoy)

Aunque solo exista un negocio, su configuracion (nombre, logo, favicon,
colores, telefono, WhatsApp, direccion, redes sociales, descripcion,
horarios, informacion de contacto) vive en la tabla `business` y se
consume desde la UI, nunca hardcodeada. Esto hace que activar un segundo
negocio en el futuro sea agregar una fila, no reescribir componentes.
