import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function AppHeader() {
  const { session } = useAuth();

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 border-b border-gray-200/70 bg-page/85 pt-[env(safe-area-inset-top)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          to="/"
          aria-label="Merida Ballet Academy, ir al inicio"
          className="-mx-1 rounded-control px-1 py-1 transition-opacity duration-150 active:opacity-70"
        >
          <BrandLogo variant="horizontal" alt="" className="h-10" />
        </Link>
        {!session && (
          <Link
            id="header-sign-in-link"
            to="/login"
            className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-[background-color,border-color,scale] duration-150 ease-(--ease-brand) hover:border-gray-400 active:scale-[0.96]"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}
