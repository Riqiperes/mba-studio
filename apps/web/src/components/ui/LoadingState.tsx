import { BrandLogo } from "@/components/ui/BrandLogo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface LoadingStateProps {
  message?: string;
  /** Ocupa toda la pantalla con el monograma (arranque, RequireAuth). */
  fullScreen?: boolean;
  id?: string;
}

export function LoadingState({ message = "Cargando…", fullScreen = false, id }: LoadingStateProps) {
  return (
    <div
      id={id}
      role="status"
      className={`flex flex-col items-center justify-center gap-4 px-6 text-center text-ink-muted ${
        fullScreen ? "min-h-dvh bg-page" : "min-h-[40dvh]"
      }`}
    >
      {fullScreen ? (
        <BrandLogo variant="monogram" alt="" className="h-14 animate-pulse" />
      ) : (
        <LoadingSpinner className="h-6 w-6 text-accent" />
      )}
      <p className="text-sm">{message}</p>
    </div>
  );
}
