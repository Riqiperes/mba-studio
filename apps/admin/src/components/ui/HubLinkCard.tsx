import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface HubLinkCardProps {
  to: string;
  label: string;
  Icon: LucideIcon;
  description?: string | undefined;
  /** Numero de pendientes; se muestra como pastilla junto al titulo. */
  badgeCount?: number | undefined;
  badgeLabel?: string | undefined;
  size?: "md" | "lg" | undefined;
}

/** Tarjeta-enlace de los hubs del panel (Inicio, Estudio, Academia). */
export function HubLinkCard({ to, label, Icon, description, badgeCount, badgeLabel = "pendientes", size = "md" }: HubLinkCardProps) {
  const isLarge = size === "lg";
  return (
    <Link
      to={to}
      className={`group relative flex flex-col rounded-card border border-borde bg-tarjeta shadow-card transition-[translate,border-color] duration-200 ease-(--ease-brand) hover:-translate-y-0.5 hover:border-acento/40 active:scale-[0.99] ${
        isLarge ? "gap-6 p-6 sm:p-8" : "gap-4 p-5 sm:p-6"
      }`}
    >
      <span
        className={`grid place-items-center rounded-full bg-acento-suave text-acento ${isLarge ? "h-14 w-14" : "h-11 w-11"}`}
      >
        <Icon className={isLarge ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <ArrowUpRight
        className="absolute top-5 right-5 h-5 w-5 text-texto-suave transition-[translate,color] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-acento"
        strokeWidth={1.6}
        aria-hidden="true"
      />
      <span className="space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={`font-medium text-texto ${isLarge ? "font-display text-titulo" : "text-subtitulo"}`}>{label}</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-acento px-2 text-pequeno font-medium tabular-nums text-sobre-acento">
              {badgeCount}
              <span className="sr-only"> {badgeLabel}</span>
            </span>
          )}
        </span>
        {description && <span className="block text-pequeno text-texto-suave">{description}</span>}
      </span>
    </Link>
  );
}
