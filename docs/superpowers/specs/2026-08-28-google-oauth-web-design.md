# Google OAuth en apps/web — Diseño

Fecha: 2026-08-28
Estado: Aprobado, pendiente de implementacion.

## Contexto

`docs/authentication.md` y `docs/roadmap.md` definen la etapa "Authentication"
como: email/password, Google OAuth, logout, recuperacion de contrasena,
verificacion de email y proteccion de rutas. Es una etapa grande que cubre
varias piezas independientes, asi que este spec cubre solo la primera:
Google OAuth funcionando de punta a punta en `apps/web`, suficiente para
validar que el trigger `on_auth_user_created` (migracion `002_profiles.sql`)
crea el `profile` correctamente cuando alguien entra con Google. El resto de
la etapa (email/password, recuperacion de contrasena, `apps/admin`,
proteccion de rutas por rol) se especifica por separado mas adelante.

No existe codigo de auth todavia en el repo (solo el `README.md` placeholder
de `features/auth/`), asi que esto es trabajo arquitectonico: establece el
patron que van a reusar el resto de features de `apps/web`.

## Alcance

Dentro de este spec:

- Boton "Continuar con Google" que dispara `supabase.auth.signInWithOAuth`.
- Sesion persistida y accesible en toda la app via un `AuthProvider` +
  `useAuth()`.
- El `profile` (rol, `business_id`, nombre) se trae automaticamente al
  autenticarse.
- Una ruta protegida minima (`RequireAuth`) que redirige a `/login` sin
  sesion.
- Logout.
- Manejo de errores visible (login fallido, o `profile` que no aparece tras
  autenticar — senal de que el trigger no corrio).

Fuera de alcance (specs futuros):

- Email/password, recuperacion de contrasena, verificacion de email.
- `apps/admin` (sigue con su pantalla placeholder).
- Proteccion de rutas por rol (`STAFF`/`BUSINESS_ADMIN`/`SUPER_ADMIN`); este
  spec solo protege por "hay sesion o no".
- Cualquier pantalla real de Studio/Academia — `HomePage` es un placeholder
  que confirma que el login funciono, no una pantalla de producto.
- Tests automatizados (el proyecto no tiene suite de tests todavia, ver
  `docs/testing.md`; se agregan cuando se decida introducir Vitest).
- Configurar el proveedor Google en el dashboard de Supabase (requiere
  credenciales de Google Cloud Console del usuario; queda documentado como
  prerequisito manual, no como tarea de codigo).

## Enfoque elegido y alternativas consideradas

Para el estado de sesion se evaluaron tres opciones:

1. **Context de React + hook propio** (elegido) — un `AuthProvider` se
   suscribe a `supabase.auth.onAuthStateChange` una vez y expone
   `{ session, profile, loading, error }` via `useAuth()`. Es el patron
   recomendado por Supabase para SPAs, no agrega dependencias, y encaja con
   la capa `Page -> Componente -> hook -> service -> Supabase` que exige
   `CLAUDE.md`.
2. **Libreria de estado global (Zustand/Jotai)** — descartada: un solo
   objeto de sesion no justifica una dependencia nueva; contradice la regla
   de no sobreingenieria de `CLAUDE.md`.
3. **TanStack Query envolviendo las llamadas de auth** — descartada para
   este caso: TanStack Query brilla cacheando *datos* (packages, bookings),
   no un singleton de sesion con su propio mecanismo de suscripcion nativo
   en `supabase-js`. Se puede introducir mas adelante para las features de
   datos sin relacion con esta decision.

## Arquitectura

```
apps/web/src/
  lib/
    supabaseClient.ts          # instancia unica del cliente Supabase
  features/auth/
    services/
      authService.ts           # unico punto que llama a supabase.auth.*
    hooks/
      AuthProvider.tsx          # Context provider + useAuth()
    components/
      GoogleSignInButton.tsx
      SignOutButton.tsx
  routes/
    RequireAuth.tsx             # wrapper: sin sesion -> <Navigate to="/login" />
  pages/
    LoginPage.tsx                # publica
    HomePage.tsx                 # protegida, placeholder "sesion iniciada"
  App.tsx                        # BrowserRouter + AuthProvider + Routes
```

### `lib/supabaseClient.ts`

Cliente unico creado con `createClient(import.meta.env.VITE_SUPABASE_URL,
import.meta.env.VITE_SUPABASE_ANON_KEY)`. Ambas variables ya existen en
`apps/web/.env` (ver `.env.example`). Nunca se usa la service role key en el
frontend (regla de `CLAUDE.md`/`docs/payments.md`, aplica igual aqui).

### `features/auth/services/authService.ts`

Unico archivo que importa `supabaseClient` para llamadas de auth. Expone:

- `signInWithGoogle(): Promise<void>` — llama
  `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- `signOut(): Promise<void>` — llama `supabase.auth.signOut()`.
- `getProfile(userId: string): Promise<Profile>` — `select` a la tabla
  `profiles` (protegida por RLS: un usuario solo puede leer su propia fila
  o, si es staff/admin, las de su negocio — ver `002_profiles.sql`).
- `subscribeToAuthChanges(callback): () => void` — wrapper delgado sobre
  `supabase.auth.onAuthStateChange`, devuelve la funcion de unsubscribe.

Ningun componente ni hook llama a `supabase.auth` o a la tabla `profiles`
directamente; todos pasan por este service (regla de capas de
`CLAUDE.md`).

### `features/auth/hooks/AuthProvider.tsx` + `useAuth()`

`AuthProvider` envuelve la app entera (se monta en `App.tsx`). Al montar:

1. Llama `supabase.auth.getSession()` para el estado inicial.
2. Se suscribe con `subscribeToAuthChanges` a `SIGNED_IN`/`SIGNED_OUT`/
   `TOKEN_REFRESHED`.
3. Cuando hay `session`, llama `getProfile(session.user.id)`. Si falla o
   no devuelve fila, guarda el error en el estado en vez de dejar `profile`
   en `undefined` silenciosamente — es la senal de que el trigger no corrio.

Expone via Context: `{ session, profile, loading, error }`. `useAuth()` es
el hook que consumen componentes/paginas para leer ese estado; nunca
importan `AuthProvider` directamente salvo en `App.tsx`.

### `routes/RequireAuth.tsx`

```tsx
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null; // o un spinner minimo
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
```

Este es el patron que van a reusar todas las rutas protegidas futuras
(Studio, Academia, admin). Protege solo por "hay sesion o no" — la
proteccion por rol es un spec aparte, y de todos modos la proteccion real
de datos la hace RLS en Postgres, no esta ruta (recordatorio explicito en
`docs/authentication.md`: la proteccion de rutas en frontend es UX, no
seguridad).

### Paginas

- `LoginPage.tsx`: publica, muestra `<GoogleSignInButton />`; si `useAuth()`
  ya tiene `session`, redirige a `/` (evita que alguien ya logueado vea el
  login).
- `HomePage.tsx`: protegida por `RequireAuth`. Placeholder que muestra
  `profile.full_name`/email y rol, mas `<SignOutButton />`. Reemplaza el
  welcome screen actual de `App.tsx`.

### `App.tsx`

Pasa de ser una pantalla estatica a montar `BrowserRouter` +
`AuthProvider` + `Routes`: `/login -> LoginPage`, `/ -> RequireAuth ->
HomePage`. No hace falta una ruta de callback dedicada: `supabase-js`
detecta la sesion en la URL automaticamente al volver de Google
(comportamiento default, `detectSessionInUrl: true`).

## Flujo end-to-end

1. Usuario entra a `/` sin sesion → `RequireAuth` redirige a `/login`.
2. Click en "Continuar con Google" → `authService.signInWithGoogle()` →
   redirect a Google → vuelve a la app con la sesion en la URL.
3. `supabase-js` detecta la sesion sola, dispara `onAuthStateChange`
   (`SIGNED_IN`).
4. `AuthProvider` actualiza `session`, llama `getProfile()` para traer
   rol/negocio/nombre.
5. `RequireAuth` ve `session` y dejar pasar a `HomePage`, que muestra los
   datos del `profile`.
6. Logout: `authService.signOut()` → `onAuthStateChange` (`SIGNED_OUT`) →
   contexto se limpia → siguiente navegacion a `/` redirige a `/login`.

## Manejo de errores

- `signInWithGoogle()` falla (red, provider no configurado aun en el
  dashboard de Supabase): se captura el error y `LoginPage` lo muestra con
  un mensaje simple, sin crashear la app.
- `getProfile()` falla o no devuelve fila tras un login exitoso: es la
  senal de que `on_auth_user_created` no corrio o RLS bloqueo la lectura.
  `AuthProvider` guarda ese error explicitamente; `HomePage` lo muestra en
  vez de renderizar datos vacios como si nada — es la validacion end-to-end
  que motiva este spec.
- No se exponen mensajes crudos de Supabase al usuario final; el detalle
  completo se loguea a consola en desarrollo.

## Testing

Validacion manual (el proyecto no tiene suite de tests automatizados
todavia, fase esperada segun `docs/testing.md`):

1. `npm run dev:web`, iniciar sesion con una cuenta de Google real una vez
   el provider este configurado en el dashboard de Supabase.
2. Confirmar en el dashboard de Supabase que aparece la fila esperada en
   `profiles` (rol `CUSTOMER`, `business_id` = el negocio sembrado,
   `full_name` poblado).
3. Confirmar que `HomePage` muestra esos datos.
4. Cerrar sesion y confirmar que vuelve a `/login` y que entrar a `/`
   directamente sin sesion tambien redirige a `/login`.

## Prerequisito manual (fuera de este repo)

Antes de poder probar el flujo real, alguien con acceso a Google Cloud
Console y al dashboard de Supabase debe:

1. Crear credenciales OAuth 2.0 tipo "Web application" en Google Cloud
   Console.
2. Agregar como "Authorized redirect URI":
   `https://eazyblybekyygimqpjjw.supabase.co/auth/v1/callback`.
3. Copiar Client ID y Client Secret al dashboard de Supabase
   (Authentication > Providers > Google).
4. Agregar el origen de `apps/web` en desarrollo (`http://localhost:5173`)
   como "Authorized JavaScript origin", y el dominio real cuando exista
   deploy en Cloudflare Pages.

Sin este paso, el codigo de este spec queda escrito y compila, pero
`signInWithGoogle()` fallara en tiempo de ejecucion — es justo el error que
el manejo de errores de arriba debe mostrar con claridad, no esconder.
