# Diseño: Acceso Publico Web — Eliminar Login Gate, Mostrar Todo Sin Registro

## Contexto

Cambio fundamental en `apps/web`: **toda la informacion visible sin login**
(precios, paquetes, calendario, horarios, info academia). Login/registro
solo necesario para: reservar clases, ver "Mi horario", editar perfil,
ver creditos.

Segun `docs/business-rules.md`: "Toda la informacion visible sin login:
precios, paquetes, catalogo, calendario de clases, horarios, info de la
academia. Login/registro solo necesario para: reservar clases, ver 'Mi
horario', editar perfil, ver creditos."

## Alcance

**Incluye:**
1. **Eliminar `RequireAuth` wrapper** de rutas publicas en `App.tsx`:
   - `/` (LandingPage) — publica.
   - `/packages` — publica.
   - `/packages/:id` — publica.
   - `/classes` — publica.
   - `/classes/:id` — publica.
   - `/academy` (futuro) — publica.
2. **Mantener `RequireAuth` solo en rutas privadas:**
   - `/my-bookings` — requiere login (ver mis reservaciones).
   - `/profile` — requiere login (editar perfil, ver creditos).
   - `/academy/my-enrollments` (futuro) — requiere login.
3. **Actualizar `MainLayout` / `BottomNavigation`:**
   - Mostrar todas las tabs siempre (Inicio, Paquetes, Horarios).
   - Tab "Usuario" (`/profile`) -> si no loggeado, redirige a `/login`
     con `redirectTo=/profile`.
   - Boton "Iniciar sesion" visible en header/nav para no loggeados.
4. **`LandingPage` (`/`):** ya es publica, mantener.
5. **`PackagesCatalogPage` / `PackageDetailPage`:** ya publicas, mantener.
   - Boton "Comprar" -> si loggeado: flujo futuro Stripe. Si no: "Inicia
     sesion para comprar" -> `/login?redirect=/packages/:id`.
6. **`ClassesCalendarPage` / `ClassDetailPage`:** ya publicas, mantener.
   - Boton "Reservar" / "Unirse a lista de espera" -> si loggeado: accion
     directa. Si no: `/login?redirect=/classes/:id`.
   - Boton "Cancelar" (en mis reservaciones) -> requiere login.
7. **`AuthProvider` / `useAuth`:**
   - `loading` inicial solo para checar sesion existente.
   - No bloquear render de rutas publicas.
   - `profile` = `null` si no loggeado (no error).
8. **`LoginPage`:** agregar soporte `redirectTo` query param.

**No incluye:**
- Cambios en `apps/admin` (sigue proteido con `RequireAuth` + roles).
- SSR/SEO optimizations (futuro).
- PWA/offline (futuro).

## Cambios en `App.tsx`

```tsx
// ANTES: todo bajo RequireAuth
<Route element={<RequireAuth><MainLayout /></RequireAuth>}>
  <Route path="/" element={<LandingPage />} />
  <Route path="/packages" element={<PackagesCatalogPage />} />
  ...
</Route>

// DESPUES: rutas publicas SIN RequireAuth, privadas CON RequireAuth
<Routes>
  {/* Publicas - SIN RequireAuth */}
  <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />
  <Route path="/packages" element={<MainLayout><PackagesCatalogPage /></MainLayout>} />
  <Route path="/packages/:id" element={<MainLayout><PackageDetailPage /></MainLayout>} />
  <Route path="/classes" element={<MainLayout><ClassesCalendarPage /></MainLayout>} />
  <Route path="/classes/:id" element={<MainLayout><ClassDetailPage /></MainLayout>} />
  
  {/* Login */}
  <Route path="/login" element={<LoginPage />} />
  
  {/* Privadas - CON RequireAuth */}
  <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
    <Route path="/my-bookings" element={<MyBookingsPage />} />
    <Route path="/profile" element={<UserProfilePage />} />
    {/* Futuro: /academy/my-enrollments */}
  </Route>
</Routes>
```

## `MainLayout` / `BottomNavigation` cambios

```tsx
// BottomNavigation: siempre muestra 4 tabs
const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/packages', label: 'Paquetes', icon: '📦' },
  { to: '/classes', label: 'Horarios', icon: '📅' },
  { to: '/profile', label: 'Usuario', icon: '👤' }, // Si no loggeado -> login
] as const;

// En BottomNavigation:
{NAV_ITEMS.map((item) => (
  <Link
    key={item.to}
    to={item.to === '/profile' && !session ? `/login?redirect=${item.to}` : item.to}
    ...
  />
))}

// Header: boton "Iniciar sesion" si !session
{!session && (
  <Link to="/login" className="text-sm text-brand-primary hover:underline">
    Iniciar sesion
  </Link>
)}
```

## `LoginPage` — Soporte `redirectTo`

```tsx
// LoginPage.tsx
const searchParams = useSearchParams();
const redirectTo = searchParams.get('redirectTo') || '/profile';

const handleLogin = async () => {
  await signInWithGoogle(); // o email/password
  // AuthProvider detecta sesion -> navega a redirectTo
  navigate(redirectTo, { replace: true });
};
```

## `AuthProvider` — No bloquear rutas publicas

```tsx
// AuthProvider.tsx
useEffect(() => {
  const unsubscribe = subscribeToAuthChanges((nextSession) => {
    setSession(nextSession);
    // NO setLoading(false) aqui para rutas publicas
    // Solo setLoading(false) despues de carga inicial de perfil
    if (nextSession) {
      loadProfile(nextSession.user.id).finally(() => setLoading(false));
    } else {
      setProfile(null);
      setLoading(false);
    }
  });
  return () => unsubscribe();
}, []);
```

## `ClassesCalendarPage` / `ClassDetailPage` — Botones condicionales

```tsx
// En ClassDetailPage / tarjeta de clase
const isLoggedIn = !!session;

{isLoggedIn ? (
  // Botones reales: Reservar / Cancelar / Waitlist
  <ReservationActions classId={cls.id} ... />
) : (
  // Botones que llevan a login con redirect
  <Link to={`/login?redirect=/classes/${cls.id}`} className="w-full ...">
    Inicia sesion para reservar
  </Link>
)}
```

## Testing

Checklist manual:
1. Usuario sin login entra a `/` -> ve LandingPage.
2. Usuario sin login entra a `/packages` -> ve catalogo completo.
3. Usuario sin login entra a `/packages/:id` -> ve detalle, boton "Comprar" -> `/login?redirect=/packages/:id`.
4. Usuario sin login entra a `/classes` -> ve calendario completo.
5. Usuario sin login entra a `/classes/:id` -> ve detalle, boton "Reservar" -> `/login?redirect=/classes/:id`.
6. Usuario sin login click tab "Usuario" -> `/login?redirect=/profile`.
7. Usuario loggeado ve todo normal, botones funcionan directo.
8. Usuario loggeado en `/my-bookings` -> ve sus reservaciones.
9. Usuario loggeado en `/profile` -> ve/edita perfil.
10. Logout -> vuelve a estado publico, tabs funcionan.

## Fuera de alcance

- SEO/SSR para paginas publicas (migracion a Next.js o SSR en Vite).
- Cache/CDN para paginas publicas.
- Analytics de conversion (login -> reserva).
- A/B testing de CTAs.