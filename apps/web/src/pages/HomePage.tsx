import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const dashboardItems = [
  {
    to: "/packages",
    label: "Paquetes",
    description: "Ver paquetes disponibles y precios",
    icon: "📦",
  },
  {
    to: "/classes",
    label: "Horario de clases",
    description: "Ver próximas clases y disponibilidad",
    icon: "📅",
  },
];

export function HomePage() {
  const { session, profile, error } = useAuth();

  return (
    <div id="home-page" className="space-y-8">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-primary">
            Bienvenido, {profile?.fullName?.split(" ")[0] ?? "usuario"}
          </h1>
          <p className="text-gray-600">¿Qué te gustaría hacer hoy?</p>
        </div>
        <SignOutButton />
      </section>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium text-gray-900">Explorar</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {dashboardItems.map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center text-center p-8">
                  <span className="mb-4 text-4xl">{item.icon}</span>
                  <h3 className="text-lg font-semibold text-brand-primary">{item.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Ver más
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 pt-8">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Tu cuenta</h2>
        <Card>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{session?.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rol</span>
              <span className="font-medium capitalize">{profile?.role?.toLowerCase()}</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}