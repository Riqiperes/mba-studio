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

Google OAuth implementado en `apps/web` y mergeado a `develop`: pagina
`/login` con boton "Continuar con Google" que llama
`authService.signInWithGoogle()`; estado de sesion global via
`AuthProvider`/`useAuth()` (`features/auth/hooks/AuthProvider.tsx`), que se
suscribe a los cambios de sesion y carga el `profile` automaticamente al
autenticarse; guarda de ruta minima `RequireAuth` (`routes/RequireAuth.tsx`)
que redirige a `/login` sin sesion; y logout via `SignOutButton`. Detalle
completo del diseno en
`docs/superpowers/specs/2026-08-28-google-oauth-web-design.md`.

El proveedor de Google ya esta configurado en el dashboard de Supabase, y el
flujo se verifico de punta a punta con una cuenta real (2026-08-28): login
exitoso, fila creada en `auth.users`, y el trigger `on_auth_user_created`
creo el `profile` correspondiente automaticamente.

Registro e inicio de sesion con email/password tambien implementado en
`apps/web`: mismo `/login`, con un formulario (`EmailPasswordForm.tsx`)
debajo del boton de Google que alterna entre "Iniciar sesion" y "Crear
cuenta" sin cambiar de ruta. Agrega a `authService.ts`
`signUpWithEmail(email, password, fullName)` y
`signInWithEmail(email, password)`, mismo patron throw-on-error que el
resto del servicio. Validacion de formato con `zod` (email valido,
contrasena minimo 8 caracteres) — el `<form>` usa `noValidate` para que la
validacion nativa del navegador no bloquee el submit antes de que corra la
de `zod`. Si Supabase requiere confirmar el correo (el caso de este
proyecto), `signUpWithEmail` no devuelve sesion y la UI muestra "revisa tu
correo" en vez de navegar; `AuthProvider` sigue siendo el unico que
reacciona a que haya sesion o no, sin cambios ahi. Errores comunes de
Supabase (`Invalid login credentials`, `User already registered`, `Email
not confirmed`) se mapean a mensajes en espanol; probado de punta a punta
con una cuenta real via alias `+` de Gmail (2026-08-28): registro,
confirmacion pendiente detectada correctamente al intentar entrar antes de
confirmar, `profile` creado igual que con Google.

Todavia NO implementado: recuperacion de contrasena, reenvio de
verificacion de email, login en `apps/admin`, y proteccion de rutas por rol
(`RequireAuth` solo protege por "hay sesion o no"; la proteccion real de
datos la sigue haciendo RLS).
