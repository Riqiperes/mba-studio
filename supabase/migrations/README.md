# supabase/migrations

Aqui viven todas las migraciones de base de datos, en orden, nunca editadas
una vez aplicadas en produccion (ver CLAUDE.md, seccion Reglas de base de
datos, y `docs/database.md`).

## Convencion de nombres

```
001_business.sql
002_profiles.sql
003_instructors.sql
004_studio_classes.sql
005_packages.sql
006_bookings.sql
007_waitlist.sql
008_academy.sql
009_payments.sql
010_notifications.sql
```

- Prefijo numerico de 3 digitos, secuencial, nunca reutilizado.
- Nombre en snake_case describiendo la entidad principal que crea/modifica.
- Una migracion pequena y enfocada es mejor que una migracion gigante.
- Nunca modificar un archivo ya mergeado a `main`: crear una nueva migracion
  que corrija lo necesario.

## Estado actual

Carpeta preparada, sin migraciones todavia. La primera migracion real
(`001_business.sql`) se crea en la etapa "Database" del roadmap (ver
`docs/roadmap.md`), junto con la definicion completa de RLS en
`docs/database.md` y `docs/security.md`.

## Como aplicar migraciones

Ver `docs/development.md` y `docs/PROJECT_RECOVERY.md` para el flujo
completo con Supabase CLI (`supabase migration up` / `supabase db push`).
