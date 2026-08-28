# @mba-studio/shared

Tipos y constantes de TypeScript compartidos entre `apps/web` y `apps/admin`
(por ejemplo `UserRole`, `BusinessConfig`). No contiene componentes de React
ni logica de negocio, unicamente contratos de datos.

## Estado actual

Paquete preparado como parte del workspace de npm, con un par de tipos base
para ilustrar el patron. Todavia no esta importado desde `apps/web` ni
`apps/admin` porque ninguna feature real lo necesita aun. Se ira poblando a
medida que existan tipos que de verdad se dupliquen entre ambas apps
(paquetes, clases, reservaciones, etc.) - ver `docs/roadmap.md`.

## Convencion

- Un tipo por archivo dentro de `src/types/`, re-exportado desde `src/index.ts`.
- Sin dependencias de runtime salvo que sea estrictamente necesario (este
  paquete se importa en dos apps distintas, cualquier dependencia aqui pesa
  el doble).
