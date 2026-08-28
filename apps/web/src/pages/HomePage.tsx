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
