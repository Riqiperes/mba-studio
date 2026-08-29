import { useAuth } from "@/features/auth/hooks/AuthProvider";

export function HomePage() {
  const { session, profile } = useAuth();

  return (
    <div
      id="admin-dashboard"
      className="flex flex-col items-center justify-center gap-4 p-12 text-center"
    >
      <h1 className="text-2xl font-semibold text-brand-primary">Panel administrativo</h1>
      <div className="text-gray-700">
        <p>{profile?.fullName ?? session?.user.email}</p>
        <p className="text-sm text-gray-500">{session?.user.email}</p>
        <p className="text-sm text-gray-500">Rol: {profile?.role}</p>
      </div>
    </div>
  );
}
