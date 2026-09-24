/*
 * Clases de boton compartidas por <Button> y por enlaces que se ven como
 * boton (<Link>, <a> de WhatsApp), para no duplicar estilos.
 *
 * Variantes de PROMPT.md: primario (acento lleno, una accion principal por
 * pantalla), secundario (contorno acento) y suave (acento-suave). "outline"
 * es neutro para acciones como Cancelar; "ghost" no tiene fondo.
 */
export type ButtonVariant = "primary" | "secondary" | "soft" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-acento text-sobre-acento hover:brightness-110",
  secondary: "border border-acento text-acento hover:bg-acento-suave",
  soft: "bg-acento-suave text-acento hover:brightness-[0.97]",
  outline: "border border-borde-control/60 bg-tarjeta text-texto hover:border-borde-control",
  ghost: "text-texto-suave hover:bg-suave hover:text-texto",
};

// Alturas minimas de 40/44/52px para que el area tactil sea comoda.
const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-pequeno",
  md: "min-h-11 px-[22px] text-cuerpo",
  lg: "min-h-13 px-7 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-control text-center font-medium transition-[background-color,border-color,color,filter,scale] duration-200 ease-(--ease-brand) active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
}
