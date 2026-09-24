import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomNavigation } from "@/components/ui/BottomNavigation";

export function MainLayout() {
  return (
    <div className="min-h-dvh bg-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-card"
      >
        Saltar al contenido
      </a>
      <AppHeader />
      {/* Espacio inferior = alto del menu (64px) + area segura del telefono */}
      <main id="main-content" className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
