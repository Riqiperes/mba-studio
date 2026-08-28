# Google OAuth en apps/web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login con Google funcionando de punta a punta en `apps/web`: boton de login, sesion accesible en toda la app, `profile` (rol/negocio/nombre) cargado automaticamente, ruta protegida minima, logout, y errores visibles en vez de pantallas vacias.

**Architecture:** Context de React (`AuthProvider` + `useAuth()`) suscrito a `supabase.auth.onAuthStateChange`, con un `authService.ts` como unico punto que toca `supabase.auth`/`profiles` directamente (capa `Page -> Componente -> hook -> service -> Supabase` de `CLAUDE.md`). `RequireAuth` protege por sesion (no por rol todavia).

**Tech Stack:** React 19 + TypeScript strict, `@supabase/supabase-js` ^2.45.4, `react-router-dom` ^6.28, Tailwind CSS v4. Sin libreria de estado adicional (ver spec, seccion "Enfoque elegido").

**Spec:** `docs/superpowers/specs/2026-08-28-google-oauth-web-design.md`

## Global Constraints

- Nunca usar la service role key de Supabase en el frontend — solo `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (ya existen en `apps/web/.env`).
- Ningun componente ni hook llama a `supabase.auth` o a la tabla `profiles` directamente; todo pasa por `features/auth/services/authService.ts`.
- La proteccion de rutas del frontend es UX, no seguridad — la seguridad real la aplica RLS en Postgres (ya implementado en `002_profiles.sql`, `007`, `008`).
- El proyecto no tiene suite de tests automatizados todavia (fase esperada segun `docs/testing.md`); cada tarea se verifica con `npm run typecheck --workspace apps/web` y `npm run lint --workspace apps/web`, mas los pasos de verificacion manual descritos en cada tarea. No inventar un test runner que no existe en el repo.
- Reusar `UserRole` de `@mba-studio/shared` (`packages/shared/src/types/role.ts`) en vez de redefinir el union type.
- IDs de HTML descriptivos en los elementos interactivos nuevos (regla de `CLAUDE.md`): `google-sign-in-button`, `sign-out-button`, `login-page`, `home-page`.

---

## Task 1: Cliente de Supabase y tipo `Profile`

**Files:**
- Create: `apps/web/src/lib/supabaseClient.ts`
- Create: `apps/web/src/features/auth/types/profile.ts`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: `supabase` (instancia de `SupabaseClient`, exportada desde `@/lib/supabaseClient`), tipo `Profile` (exportado desde `@/features/auth/types/profile`) con forma `{ id: string; businessId: string; role: UserRole; fullName: string | null; phone: string | null; createdAt: string; updatedAt: string }`.

- [ ] **Step 1: Crear el cliente de Supabase**

```ts
// apps/web/src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa apps/web/.env (ver .env.example).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Crear el tipo `Profile`**

```ts
// apps/web/src/features/auth/types/profile.ts
import type { UserRole } from "@mba-studio/shared";

/**
 * Forma en camelCase de una fila de la tabla `profiles` (ver
 * supabase/migrations/002_profiles.sql). El mapeo snake_case -> camelCase
 * vive en features/auth/services/authService.ts.
 */
export type Profile = {
  id: string;
  businessId: string;
  role: UserRole;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 3: Verificar tipos y lint**

Run: `npm run typecheck --workspace apps/web`
Expected: sin errores (el archivo no se usa todavia en ningun lado, pero debe compilar solo).

Run: `npm run lint --workspace apps/web`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/supabaseClient.ts apps/web/src/features/auth/types/profile.ts
git commit -m "feat(auth): cliente de Supabase y tipo Profile"
```

---

## Task 2: `authService.ts` — unico punto de contacto con `supabase.auth`

**Files:**
- Create: `apps/web/src/features/auth/services/authService.ts`

**Interfaces:**
- Consumes: `supabase` de `@/lib/supabaseClient` (Task 1), `Profile` de `@/features/auth/types/profile` (Task 1).
- Produces:
  - `signInWithGoogle(): Promise<void>`
  - `signOut(): Promise<void>`
  - `getProfile(userId: string): Promise<Profile>`
  - `subscribeToAuthChanges(callback: (session: Session | null) => void): () => void` (`Session` es el tipo de `@supabase/supabase-js`)

- [ ] **Step 1: Escribir el servicio**

```ts
// apps/web/src/features/auth/services/authService.ts
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "../types/profile";

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, business_id, role, full_name, phone, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    businessId: data.business_id,
    role: data.role,
    fullName: data.full_name,
    phone: data.phone,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function subscribeToAuthChanges(
  callback: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npm run typecheck --workspace apps/web`
Expected: sin errores.

Run: `npm run lint --workspace apps/web`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/services/authService.ts
git commit -m "feat(auth): authService con signInWithGoogle, signOut, getProfile y subscribeToAuthChanges"
```

---

## Task 3: `AuthProvider` + `useAuth()`

**Files:**
- Create: `apps/web/src/features/auth/hooks/AuthProvider.tsx`

**Interfaces:**
- Consumes: `getProfile`, `subscribeToAuthChanges` de `@/features/auth/services/authService` (Task 2); `Profile` de `@/features/auth/types/profile` (Task 1).
- Produces:
  - `AuthProvider({ children }: { children: ReactNode })` — componente, se monta una sola vez en `App.tsx` (Task 6).
  - `useAuth(): { session: Session | null; profile: Profile | null; loading: boolean; error: string | null }` — hook, consumido por `RequireAuth`, `LoginPage`, `HomePage` (Task 5).

- [ ] **Step 1: Escribir el provider y el hook**

```tsx
// apps/web/src/features/auth/hooks/AuthProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getProfile, subscribeToAuthChanges } from "../services/authService";
import type { Profile } from "../types/profile";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile(userId: string) {
      try {
        const nextProfile = await getProfile(userId);
        if (isMounted) setProfile(nextProfile);
      } catch (err) {
        if (isMounted) {
          setProfile(null);
          setError(
            "No se pudo cargar tu perfil. Si acabas de registrarte, es posible que la creacion automatica del perfil haya fallado.",
          );
        }
        console.error("[auth] getProfile fallo", err);
      }
    }

    // supabase-js dispara este callback una vez de inmediato con la sesion
    // actual (o null) al suscribirse, ademas de en cada cambio posterior —
    // por eso no hace falta llamar getSession() por separado.
    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setError(null);
      setLoading(false);

      if (nextSession) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npm run typecheck --workspace apps/web`
Expected: sin errores (el provider no se usa todavia en `App.tsx`, pero debe compilar solo; `react-hooks/exhaustive-deps` de ESLint debe pasar porque el `useEffect` no referencia nada externo).

Run: `npm run lint --workspace apps/web`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/hooks/AuthProvider.tsx
git commit -m "feat(auth): AuthProvider y useAuth suscritos a onAuthStateChange"
```

---

## Task 4: `GoogleSignInButton` y `SignOutButton`

**Files:**
- Create: `apps/web/src/features/auth/components/GoogleSignInButton.tsx`
- Create: `apps/web/src/features/auth/components/SignOutButton.tsx`

**Interfaces:**
- Consumes: `signInWithGoogle`, `signOut` de `@/features/auth/services/authService` (Task 2).
- Produces: `GoogleSignInButton()` y `SignOutButton()` — componentes sin props, consumidos por `LoginPage` y `HomePage` (Task 5).

- [ ] **Step 1: Escribir `GoogleSignInButton`**

```tsx
// apps/web/src/features/auth/components/GoogleSignInButton.tsx
import { useState } from "react";
import { signInWithGoogle } from "../services/authService";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setError(null);
    setIsLoading(true);
    try {
      // Si tiene exito, el navegador redirige a Google — este componente
      // se desmonta y no hace falta volver isLoading a false.
      await signInWithGoogle();
    } catch (err) {
      setIsLoading(false);
      setError("No se pudo iniciar el login con Google. Intenta de nuevo.");
      console.error("[auth] signInWithGoogle fallo", err);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        id="google-sign-in-button"
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {isLoading ? "Conectando con Google..." : "Continuar con Google"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Escribir `SignOutButton`**

```tsx
// apps/web/src/features/auth/components/SignOutButton.tsx
import { useState } from "react";
import { signOut } from "../services/authService";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      await signOut();
    } catch (err) {
      console.error("[auth] signOut fallo", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      id="sign-out-button"
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {isLoading ? "Cerrando sesion..." : "Cerrar sesion"}
    </button>
  );
}
```

- [ ] **Step 3: Verificar tipos y lint**

Run: `npm run typecheck --workspace apps/web`
Expected: sin errores.

Run: `npm run lint --workspace apps/web`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/components/GoogleSignInButton.tsx apps/web/src/features/auth/components/SignOutButton.tsx
git commit -m "feat(auth): GoogleSignInButton y SignOutButton"
```

---

## Task 5: `RequireAuth`, `LoginPage`, `HomePage`

**Files:**
- Create: `apps/web/src/routes/RequireAuth.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `useAuth` de `@/features/auth/hooks/AuthProvider` (Task 3); `GoogleSignInButton`, `SignOutButton` de `@/features/auth/components/*` (Task 4).
- Produces: `RequireAuth({ children }: { children: ReactNode })`, `LoginPage()`, `HomePage()` — consumidos por `App.tsx` (Task 6).

- [ ] **Step 1: Escribir `RequireAuth`**

```tsx
// apps/web/src/routes/RequireAuth.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

- [ ] **Step 2: Escribir `LoginPage`**

```tsx
// apps/web/src/pages/LoginPage.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";

export function LoginPage() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      id="login-page"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6"
    >
      <h1 className="text-2xl font-semibold text-brand-primary">MBA MID</h1>
      <p className="text-gray-600">Inicia sesion para continuar</p>
      <GoogleSignInButton />
    </div>
  );
}
```

- [ ] **Step 3: Escribir `HomePage`**

```tsx
// apps/web/src/pages/HomePage.tsx
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

export function HomePage() {
  const { session, profile, error } = useAuth();

  return (
    <div
      id="home-page"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h1 className="text-2xl font-semibold text-brand-primary">Sesion iniciada</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {profile ? (
        <div className="text-gray-700">
          <p>{profile.fullName ?? session?.user.email}</p>
          <p className="text-sm text-gray-500">{session?.user.email}</p>
          <p className="text-sm text-gray-500">Rol: {profile.role}</p>
        </div>
      ) : (
        !error && <p className="text-gray-500">Cargando tu perfil...</p>
      )}
      <SignOutButton />
    </div>
  );
}
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npm run typecheck --workspace apps/web`
Expected: sin errores.

Run: `npm run lint --workspace apps/web`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/RequireAuth.tsx apps/web/src/pages/LoginPage.tsx apps/web/src/pages/HomePage.tsx
git commit -m "feat(auth): RequireAuth, LoginPage y HomePage"
```

---

## Task 6: Conectar el router en `App.tsx` y verificacion end-to-end

**Files:**
- Modify: `apps/web/src/App.tsx` (reemplaza el welcome screen estatico completo)

**Interfaces:**
- Consumes: `AuthProvider` (Task 3), `RequireAuth` (Task 5), `LoginPage` (Task 5), `HomePage` (Task 5).
- Produces: nada nuevo — es la tarea que conecta todo lo anterior en la app real.

- [ ] **Step 1: Reescribir `App.tsx`**

```tsx
// apps/web/src/App.tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 2: Verificar tipos, lint y build completo**

Run: `npm run typecheck --workspace apps/web`
Expected: sin errores.

Run: `npm run lint --workspace apps/web`
Expected: sin errores.

Run: `npm run build:web`
Expected: build exitoso (confirma que Vite resuelve todos los imports con el alias `@/` y que no quedo nada del `App.tsx` viejo referenciado en otro lado).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(auth): conectar router (login/home) en App.tsx"
```

- [ ] **Step 4: Verificacion manual end-to-end (requiere el prerequisito manual del spec)**

Esta verificacion solo puede completarse despues de que alguien haya configurado el proveedor Google en el dashboard de Supabase (Authentication > Providers > Google) siguiendo el prerequisito documentado en la seccion "Prerequisito manual" de `docs/superpowers/specs/2026-08-28-google-oauth-web-design.md`. Si ese paso todavia no esta hecho, saltar este step y dejarlo anotado como pendiente — el codigo ya compila y el error de login se vera con claridad en `LoginPage` en vez de romper la app.

Run: `npm run dev:web`

1. Abrir `http://localhost:5173/` sin sesion — debe redirigir a `/login`.
2. Click en "Continuar con Google", completar el login con una cuenta de Google real.
3. Confirmar que vuelve a `http://localhost:5173/` y que `HomePage` muestra nombre/email y `Rol: CUSTOMER`.
4. En el dashboard de Supabase (Table Editor > `profiles`), confirmar que aparecio la fila nueva con `business_id` = el negocio sembrado (`MBA MID`) y `role = CUSTOMER`.
5. Click en "Cerrar sesion" — debe volver a `/login`.
6. Visitar `http://localhost:5173/` de nuevo directamente — debe redirigir a `/login` (la sesion realmente se cerro, no quedo cacheada).

Expected: los 6 puntos se cumplen. Si el punto 3/4 falla (no aparece `profile`), es la senal de que el trigger `on_auth_user_created` no corrio o RLS bloqueo el `select` — reportarlo, no es un bug de este plan sino algo a diagnosticar en la base de datos.

---

## Self-Review (completado al escribir este plan)

**Cobertura del spec:** boton Google (Task 4), sesion en contexto (Task 3), carga de `profile` (Task 2+3), ruta protegida minima (Task 5), logout (Task 4), errores visibles en vez de pantallas vacias (Task 3 error state, consumido en Task 5), verificacion end-to-end (Task 6 Step 4). Los items "Fuera de alcance" del spec (email/password, `apps/admin`, proteccion por rol, tests automatizados) no tienen tareas aqui a proposito.

**Placeholders:** ninguno — cada step trae el codigo completo, sin TBD/TODO.

**Consistencia de tipos:** `Profile` (Task 1) se usa igual en `authService.getProfile` (Task 2), `AuthProvider` (Task 3) y `HomePage` (Task 5). `subscribeToAuthChanges` (Task 2) y su firma `(session: Session | null) => void` coinciden entre quien la define y quien la consume (Task 3). Los imports de `@/features/auth/hooks/AuthProvider` en `RequireAuth`, `LoginPage`, `HomePage` y `App.tsx` usan el mismo path en las cuatro tareas.
