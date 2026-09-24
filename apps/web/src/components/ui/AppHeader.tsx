import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { buttonClasses } from "@/components/ui/buttonStyles";

export function AppHeader() {
  const { session } = useAuth();

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 border-b border-borde bg-tarjeta/90 pt-[env(safe-area-inset-top)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-[76px] max-w-[980px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          to="/"
          aria-label="Merida Ballet Academy, ir al inicio"
          className="-mx-1 rounded-chip px-1 py-1 transition-opacity duration-200 active:opacity-70"
        >
          <BrandLogo variant="horizontal" alt="" className="h-9 sm:h-11" />
        </Link>
        {!session && (
          <Link id="header-sign-in-link" to="/login" className={buttonClasses("soft", "sm")}>
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}
