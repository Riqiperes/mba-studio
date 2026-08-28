/**
 * App.tsx - punto de entrada del panel administrativo.
 *
 * Pantalla temporal. El enrutamiento y las secciones reales (Dashboard,
 * Clases, Calendario, Paquetes, Clientes, Academia, Pagos, Asistencias,
 * Lista de espera, Notificaciones, Configuracion) se agregan en las
 * siguientes etapas del roadmap. Ver docs/roadmap.md.
 */
function App() {
  return (
    <div id="admin-dashboard" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-brand-primary">MBA MID - Panel administrativo</h1>
      <p className="max-w-md text-gray-600">
        Base del proyecto lista. Las secciones administrativas se construyen
        en las siguientes etapas. Ver{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">docs/roadmap.md</code>.
      </p>
    </div>
  );
}

export default App;
