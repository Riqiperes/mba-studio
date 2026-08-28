/**
 * App.tsx - punto de entrada de la app de cliente (Studio + Academia).
 *
 * Esta es una pantalla de bienvenida temporal. El enrutamiento real
 * (react-router-dom) y las features (auth, studio, academy, bookings,
 * packages, payments) se agregan en las siguientes etapas del roadmap.
 * Ver docs/roadmap.md.
 */
function App() {
  return (
    <div id="app-root" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-brand-primary">MBA MID</h1>
      <p className="max-w-md text-gray-600">
        Base del proyecto lista. Las funcionalidades de Studio, Academia y
        reservaciones se construyen en las siguientes etapas. Ver{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">docs/roadmap.md</code>.
      </p>
    </div>
  );
}

export default App;
