import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomNavigation } from "@/components/ui/BottomNavigation";

export function MainLayout() {
  return (
    <div className="relative min-h-dvh bg-superficie">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-tarjeta focus:px-4 focus:py-2 focus:text-pequeno focus:shadow-card"
      >
        Saltar al contenido
      </a>

      {/* Fondo decorativo de PROMPT.md: fijo, detras del contenido, sin clics */}
      <div id="page-decorative-background" aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src="/brand/monograma-linea.svg"
          alt=""
          className="absolute -bottom-10 -left-20 w-[min(760px,115vw)] max-w-none opacity-35"
        />
        <img
          src="/brand/corner-motif-rosa.svg"
          alt=""
          className="absolute top-[calc(76px+env(safe-area-inset-top))] right-0 w-[64px] opacity-55 sm:w-[84px]"
        />
      </div>

      <AppHeader />
      {/* Espacio inferior = alto del menu (68px) + area segura del telefono */}
      <main id="main-content" className="relative z-10 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
