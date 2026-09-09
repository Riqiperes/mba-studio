import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { updateProfile } from "@/features/auth/services/authService";
import { useMyAcademyEnrollments } from "@/features/academy/hooks/useMyAcademyEnrollments";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { BackButton } from "@/components/ui/BackButton";

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente de aprobación",
  ACTIVA: "Activa",
  BAJA: "Inactiva",
  MUESTRA: "Clase muestra solicitada",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  ACTIVA: "bg-green-100 text-green-800",
  BAJA: "bg-gray-100 text-gray-600",
  MUESTRA: "bg-blue-100 text-blue-800",
};

export function UserProfilePage() {
  const { profile, session } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { enrollments, loading: enrollmentsLoading } = useMyAcademyEnrollments();

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setPhone(profile.phone ?? "");
      setMedicalConditions(profile.medicalConditions ?? "");
    }
  }, [profile]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.user.id) return;

    setSaving(true);
    setMessage(null);

    try {
      await updateProfile(session.user.id, {
        fullName: fullName.trim() || null,
        phone: phone.trim() || null,
        medicalConditions: medicalConditions.trim() || null,
      });
      setMessage({ type: "success", text: "Perfil actualizado correctamente" });
    } catch (err) {
      setMessage({ type: "error", text: "No se pudo actualizar el perfil" });
      console.error("[profile] update fallo", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="user-profile-page" className="mx-auto max-w-md px-4 py-6 space-y-6 pb-24">
      <BackButton />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Mi perfil</h1>
        <SignOutButton />
      </header>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-20 w-20 rounded-full bg-brand-primary/10 flex items-center justify-center text-3xl font-bold text-brand-primary">
              {fullName?.charAt(0).toUpperCase() ?? session?.user.email?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <p className="text-sm text-gray-500">{session?.user.email}</p>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {profile?.role ?? "CUSTOMER"}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-gray-200">
            <div className="space-y-1">
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                autoComplete="name"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                autoComplete="tel"
                placeholder="+52 999 123 4567"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="profile-medical-conditions" className="block text-sm font-medium text-gray-700">
                Condiciones médicas (opcional)
              </label>
              <textarea
                id="profile-medical-conditions"
                rows={3}
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Embarazo, hernia, lesiones, etc. Nos ayuda a cuidarte mejor en clase."
              />
            </div>

            {message && (
              <div className={`rounded-md p-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}>
                {message.text}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={saving}>
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Información de la cuenta</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Rol</dt>
              <dd className="font-medium capitalize">{profile?.role?.toLowerCase() ?? "customer"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Usuario desde</dt>
              <dd className="font-medium">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("es-MX") : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Mis alumnos e inscripciones</h2>
          {enrollmentsLoading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-gray-500">
              Todavía no has inscrito a ningún alumno. Ve a{" "}
              <Link to="/academy" className="text-brand-primary hover:underline">
                Academia
              </Link>{" "}
              para inscribir o agendar una clase muestra.
            </p>
          ) : (
            <ul id="my-academy-enrollments-list" className="space-y-2 text-sm">
              {enrollments.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{enrollment.studentName}</p>
                    <p className="text-xs text-gray-500">{enrollment.groupName}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[enrollment.status]}`}
                  >
                    {STATUS_LABELS[enrollment.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}