/*
 * Logos del kit de marca (docs/frontend/brand/, copiados a public/brand/).
 * Nunca se redibujan, recolorean ni deforman: solo se escalan.
 * horizontal = header, vertical = login, monogram = estados vacios y carga.
 */
const LOGO_SOURCES = {
  horizontal: "/brand/logo-horizontal-malva.svg",
  vertical: "/brand/logo-vertical-rosa.svg",
  monogram: "/brand/monograma-malva.svg",
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
