# Autenticacion

## Proveedor

Supabase Auth es la unica fuente de identidad. Nunca se guardan contrasenas
manualmente ni se reimplementa hashing/verificacion.

## Metodos soportados (planeados)

- Registro e inicio de sesion con email/password.
- "Continuar con Google" (Google OAuth via Supabase Auth) — metodo
  principal recomendado al usuario en el flujo de registro/login.
- Cierre de sesion.
- Recuperacion de contrasena.
- Verificacion de email cuando aplique.
- Proteccion de rutas segun sesion y rol.

## Identidad vs. perfil

- Supabase Auth (`auth.users`) es responsable unicamente de la identidad
  (email, password hash, proveedor OAuth, sesion).
- La tabla `profiles` (Postgres, ver `docs/database.md`) guarda datos
  adicionales: nombre, telefono, rol (`UserRole`), `business_id`. Se crea
  automaticamente al registrarse (trigger o Edge Function on sign up, a
  definir en la etapa de implementacion).

## Roles

`CUSTOMER`, `STAFF`, `BUSINESS_ADMIN`, `SUPER_ADMIN` (ver `CLAUDE.md`). El
rol vive en `profiles.role`, protegido por RLS: un usuario no puede
cambiarse su propio rol via API. La UI nunca decide permisos reales, solo
adapta que muestra; el permiso real lo aplica RLS/policies en Postgres y,
donde haga falta, logica adicional en Edge Functions.

## Configuracion de Google OAuth

Se configura en el dashboard de Supabase (Authentication > Providers >
Google), no como variable de entorno del frontend. Pasos:

1. Crear credenciales OAuth 2.0 en Google Cloud Console (tipo "Web
   application").
2. Agregar como "Authorized redirect URI" la URL que da Supabase
   (`https://<project-ref>.supabase.co/auth/v1/callback`).
3. Copiar Client ID y Client Secret al dashboard de Supabase, seccion
   Google del proveedor de Auth.
4. Agregar los dominios de `apps/web` (y `apps/admin` si tiene login
   propio) como "Authorized JavaScript origins".

## Proteccion de rutas

Cada app define en `src/routes/` que rutas requieren sesion y que rutas
requieren un rol minimo, delegando la comprobacion real de permisos al
backend (RLS) para cualquier dato sensible — la proteccion de rutas en el
frontend es UX, no seguridad.

## Estado actual

No implementado todavia (fase de scaffolding). Se implementa en la etapa
"Authentication" / "Google OAuth" del roadmap (`docs/roadmap.md`).
