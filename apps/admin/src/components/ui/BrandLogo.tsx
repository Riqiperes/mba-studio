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
  const imageClasses = `block w-auto select-none ${className}`;

  if (!darkSource) {
    return <img src={LOGO_SOURCES[variant]} alt={alt} className={imageClasses} draggable={false} />;
  }

  // Las dos versiones; index.css (.logo-solo-claro/.logo-solo-oscuro) oculta
  // la que no corresponde al tema, incluido el forzado con data-theme.
  return (
    <>
      <img src={LOGO_SOURCES[variant]} alt={alt} className={`logo-solo-claro ${imageClasses}`} draggable={false} />
      <img src={darkSource} alt={alt} className={`logo-solo-oscuro ${imageClasses}`} draggable={false} />
    </>
  );
}
