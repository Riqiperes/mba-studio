import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { updateProfile } from "@/features/auth/services/authService";
import { useMyAcademyEnrollments } from "@/features/academy/hooks/useMyAcademyEnrollments";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { BackButton } from "@/components/ui/BackButton";
import { TextField } from "@/components/ui/TextField";
import { TextAreaField } from "@/components/ui/TextAreaField";

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente de aprobación",
  ACTIVA: "Activa",
  BAJA: "Inactiva",
  MUESTRA: "Clase muestra solicitada",
};

// Color del texto y del punto por estado; siempre acompanado de la etiqueta.
const STATUS_TONES: Record<string, { text: string; dot: string }> = {
  PENDIENTE: { text: "text-alerta", dot: "bg-alerta" },
  ACTIVA: { text: "text-exito", dot: "bg-exito" },
  BAJA: { text: "text-texto-suave", dot: "bg-texto-suave" },
  MUESTRA: { text: "text-acento", dot: "bg-acento" },
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

  const email = session?.user.email ?? "";
  const initial = (fullName.charAt(0) || email.charAt(0) || "?").toUpperCase();

  return (
    <div id="user-profile-page" className="mx-auto max-w-[760px] space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <BackButton />
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="etiqueta">Tu cuenta</p>
            <h1 className="font-display text-titulo font-medium sm:text-display-l">Mi perfil</h1>
          </div>
          <SignOutButton />
        </header>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-acento-suave font-display text-titulo font-medium text-acento"
            >
              {initial}
            </span>
            <div className="min-w-0 space-y-1.5">
              <p className="truncate text-cuerpo-l font-medium text-texto" title={email}>
                {email}
              </p>
              <span className="inline-flex rounded-chip bg-suave px-2.5 py-0.5 text-pequeno font-medium text-texto">
                {profile?.role ?? "CUSTOMER"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 border-t border-borde pt-6">
            <TextField
              id="profile-name"
              label="Nombre completo"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
            <TextField
              id="profile-phone"
              label="Teléfono"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+52 999 123 4567"
            />
            <TextAreaField
              id="profile-medical-conditions"
              label="Condiciones médicas (opcional)"
              rows={3}
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              placeholder="Embarazo, hernia, lesiones, etc. Nos ayuda a cuidarte mejor en clase."
            />

            {message && (
              <p
                role={message.type === "success" ? "status" : "alert"}
                className={`flex items-start gap-2 rounded-control bg-suave p-3 text-pequeno ${
                  message.type === "success" ? "text-exito" : "text-alerta"
                }`}
              >
                {message.type === "success" ? (
                  <CircleCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                )}
                {message.text}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={saving}>
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-display text-subtitulo font-medium">Información de la cuenta</h2>
          <dl className="divide-y divide-borde text-cuerpo">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-texto-suave">Rol</dt>
              <dd className="font-medium capitalize">{profile?.role?.toLowerCase() ?? "customer"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-texto-suave">Usuario desde</dt>
              <dd className="font-medium tabular-nums">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("es-MX") : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-display text-subtitulo font-medium">Mis alumnos e inscripciones</h2>
          {enrollmentsLoading ? (
            <p role="status" className="text-cuerpo text-texto-suave">
              Cargando…
            </p>
          ) : enrollments.length === 0 ? (
            <p className="text-cuerpo text-texto-suave text-pretty">
              Todavía no has inscrito a ningún alumno. Ve a{" "}
              <Link to="/academy" className="font-medium text-acento underline decoration-acento/40 underline-offset-4">
                Academia
              </Link>{" "}
              para inscribir o agendar una clase muestra.
            </p>
          ) : (
            <ul id="my-academy-enrollments-list" className="divide-y divide-borde">
              {enrollments.map((enrollment) => {
                const tone = STATUS_TONES[enrollment.status] ?? { text: "text-texto-suave", dot: "bg-texto-suave" };
                return (
                  <li key={enrollment.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-texto">{enrollment.studentName}</p>
                      <p className="text-pequeno text-texto-suave">{enrollment.groupName}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full bg-suave px-2.5 py-1 text-pequeno font-medium ${tone.text}`}
                    >
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      {STATUS_LABELS[enrollment.status]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
