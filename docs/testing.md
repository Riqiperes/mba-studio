# Testing

## Filosofia

Tests especialmente para reglas de negocio criticas, no para llenar el
proyecto de tests triviales. Prioridad, de mayor a menor:

1. Pagos
2. Creditos
3. Reservaciones
4. Capacidad de clase
5. Lista de espera
6. Autorizacion
7. RLS

## Ejemplos de casos que deben tener test

```
8 creditos comprados
  -> balance = 8
Reservacion
  -> balance = 7
Cancelacion valida
  -> balance = 8

Clase con capacidad 10
  -> booking numero 11 debe rechazarse

Webhook de Stripe duplicado
  -> creditos no se duplican

Customer A
  -> no puede leer informacion de Customer B (RLS)
```

## Herramientas (a definir al implementar la primera feature con logica)

Para React/TypeScript, la opcion por defecto sera Vitest (se integra bien
con Vite, misma configuracion de esbuild) + Testing Library para
componentes que valga la pena testear a ese nivel. No se agrega la
dependencia hasta que exista la primera feature real que testear, para no
instalar tooling sin uso.

Para reglas de base de datos (constraints, RLS), se prefieren tests contra
una instancia real de Postgres (Supabase local via CLI) en vez de mockear
Postgres.

## Estado actual

No hay tests todavia porque no hay features de negocio implementadas. Este
documento se actualiza con la configuracion real (scripts, carpetas de
test) en cuanto se agregue el primer test.
