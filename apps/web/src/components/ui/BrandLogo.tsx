import logoHorizontal from "@/assets/brand/logo-mba-horizontal-rosa.svg";
import logoStacked from "@/assets/brand/logo-mba-apilado-rosa.svg";
import logoArch from "@/assets/brand/logo-mba-arco-rosa.svg";
import logoMonogram from "@/assets/brand/logo-mba-monograma-rosa.svg";

/*
 * Logos oficiales (docs/frontend/logos/, decision D3):
 * horizontal = header, stacked = login, arch = landing, monogram = cargas.
 * Son la version rosa, para fondos claros.
 */
const LOGO_SOURCES = {
  horizontal: logoHorizontal,
  stacked: logoStacked,
  arch: logoArch,
  monogram: logoMonogram,
} as const;

export type BrandLogoVariant = keyof typeof LOGO_SOURCES;

interface BrandLogoProps {
  variant: BrandLogoVariant;
  className?: string;
  /** Vacio cuando el logo es decorativo (hay texto con el nombre al lado). */
  alt?: string;
}

export function BrandLogo({ variant, className = "", alt = "Merida Ballet Academy" }: BrandLogoProps) {
  return (
    <img
      src={LOGO_SOURCES[variant]}
      alt={alt}
      className={`block w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
