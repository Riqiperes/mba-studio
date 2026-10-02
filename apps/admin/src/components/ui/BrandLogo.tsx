/*
 * Logos del kit de marca (docs/frontend/brand/, copiados a public/brand/).
 * Nunca se redibujan, recolorean ni deforman: solo se escalan.
 * horizontal = header, vertical = login, monogram = estados vacios y carga.
 * En tema oscuro el horizontal cambia a la version rosa (PROMPT.md).
 */
const LOGO_SOURCES = {
  horizontal: "/brand/logo-horizontal-malva.svg",
  vertical: "/brand/logo-vertical-rosa.svg",
  monogram: "/brand/monograma-malva.svg",
} as const;

const DARK_THEME_SOURCES: Partial<Record<keyof typeof LOGO_SOURCES, string>> = {
  horizontal: "/brand/logo-horizontal-rosa.svg",
};

export type BrandLogoVariant = keyof typeof LOGO_SOURCES;

interface BrandLogoProps {
  variant: BrandLogoVariant;
  className?: string;
  /** Vacio cuando el logo es decorativo (hay texto con el nombre al lado). */
  alt?: string;
}

export function BrandLogo({ variant, className = "", alt = "Merida Ballet Academy" }: BrandLogoProps) {
  const darkSource = DARK_THEME_SOURCES[variant];
  const image = (
    <img
      src={LOGO_SOURCES[variant]}
      alt={alt}
      className={`block w-auto select-none ${className}`}
      draggable={false}
    />
  );

  if (!darkSource) return image;

  return (
    <picture>
      <source srcSet={darkSource} media="(prefers-color-scheme: dark)" />
      {image}
    </picture>
  );
}
