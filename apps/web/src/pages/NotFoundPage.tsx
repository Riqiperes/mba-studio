import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { buttonClasses } from "@/components/ui/buttonStyles";

export function NotFoundPage() {
  return (
    <div id="not-found-page" className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-16 text-center sm:py-24">
      <BrandLogo variant="monogram" alt="" className="h-20 opacity-80" />
      <p className="etiqueta">Error 404</p>
      <h1 className="font-display text-titulo font-medium">No encontramos esta página</h1>
      <p className="text-cuerpo-l text-texto-suave text-pretty">
        La dirección no existe o cambió. Vuelve al inicio para seguir navegando.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonClasses("primary", "md")}>
          Ir al inicio
        </Link>
        <Link to="/classes" className={buttonClasses("secondary", "md")}>
          Ver horarios
        </Link>
      </div>
    </div>
  );
}
