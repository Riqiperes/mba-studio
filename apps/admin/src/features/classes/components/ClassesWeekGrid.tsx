// apps/admin/src/features/classes/components/ClassesWeekGrid.tsx
import { useEffect, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { ClassOccupancy, StudioClass } from "../types/StudioClass";
import { classOccupancyLabel } from "../utils/classOccupancyLabel";
import { formatDateKey, getWeekDays } from "../utils/weekUtils";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Alto del encabezado colapsado (titulo + hora) de una carta en abanico. */
const COLLAPSED_CARD_HEIGHT = 52;
/** Distancia entre el inicio de una carta y la siguiente: menor que
    COLLAPSED_CARD_HEIGHT a proposito, para que se encimen un poco. */
const CARD_PEEK_OFFSET = 34;

type Props = {
  weekStart: Date;
  classes: StudioClass[];
  instructors: Instructor[];
  /** Reservados y lista de espera por clase (useClassOccupancy). */
  occupancy: Map<string, ClassOccupancy>;
  onEdit: (studioClass: StudioClass) => void;
  onCancel: (studioClass: StudioClass) => void;
  onDelete: (studioClass: StudioClass) => void;
  /** Movil: tocar la tarjeta abre el modal de acciones (ClassActionsModal). */
  onOpen: (studioClass: StudioClass) => void;
};

const actionClasses =
  "relative z-10 inline-flex min-h-8 items-center rounded-chip px-1.5 text-pequeno font-medium transition-colors duration-200 hover:bg-suave";

type ActionHandlers = Pick<Props, "onEdit" | "onCancel" | "onDelete">;

export function ClassesWeekGrid({ weekStart, classes, instructors, occupancy, onEdit, onCancel, onDelete, onOpen }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const activeId = pinnedId ?? hoveredId;

  // Clic fuera de cualquier carta (cada carta detiene la propagacion en su
  // propio onClick): cierra la carta fijada.
  useEffect(() => {
    function handleDocumentClick() {
      setPinnedId(null);
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const days = getWeekDays(weekStart);
  const todayKey = formatDateKey(new Date());
  const actionHandlers: ActionHandlers = { onEdit, onCancel, onDelete };

  function instructorName(instructorId: string): string {
    return instructors.find((i) => i.id === instructorId)?.fullName ?? "—";
  }

  const classesByDay = new Map<string, StudioClass[]>();
  for (const day of days) classesByDay.set(formatDateKey(day), []);
  for (const studioClass of classes) {
    const key = formatDateKey(new Date(studioClass.startsAt));
    classesByDay.get(key)?.push(studioClass);
  }
  for (const dayClasses of classesByDay.values()) {
    dayClasses.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  return (
    <>
      {/* Movil y tablet: sin cambios, un dia debajo del otro */}
      <div id="classes-week-grid-mobile" className="grid gap-4 lg:hidden">
        {days.map((day, index) => {
          const key = formatDateKey(day);
          const dayClasses = classesByDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <section
              key={key}
              aria-label={`${DAY_LABELS[index]} ${day.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`}
              className="flex flex-col gap-2"
            >
              <h2
                className={`flex items-baseline gap-2 rounded-control px-2 py-1.5 ${
                  isToday ? "bg-acento text-sobre-acento" : "text-texto"
                }`}
              >
                <span className={`text-pequeno font-medium ${isToday ? "" : "text-texto-suave"}`}>{DAY_LABELS[index]}</span>
                <span className="font-display text-subtitulo tabular-nums">
                  {day.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                </span>
              </h2>
              {dayClasses.length === 0 && <p className="px-2 text-pequeno text-texto-suave">—</p>}
              {dayClasses.map((studioClass) => (
                <MobileClassCard
                  key={studioClass.id}
                  studioClass={studioClass}
                  instructorName={instructorName(studioClass.instructorId)}
                  capacityLabel={classOccupancyLabel(studioClass.maxCapacity, occupancy.get(studioClass.id))}
                  onOpen={onOpen}
                />
              ))}
            </section>
          );
        })}
      </div>

      {/* Escritorio: 7 columnas fijas, clases en abanico si hay varias */}
      <div id="classes-week-grid-desktop" className="hidden lg:grid lg:grid-cols-7 lg:gap-2 lg:pb-16">
        {days.map((day, index) => {
          const key = formatDateKey(day);
          const dayClasses = classesByDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={key} className="flex flex-col gap-2">
              <h2
                className={`flex flex-col items-center gap-0 rounded-control px-2 py-1.5 text-center ${
                  isToday ? "bg-acento text-sobre-acento" : "text-texto"
                }`}
              >
                <span className={`text-pequeno font-medium ${isToday ? "" : "text-texto-suave"}`}>{DAY_LABELS[index]}</span>
                <span className="font-display text-subtitulo tabular-nums">{day.getDate()}</span>
              </h2>

              {dayClasses.length === 0 ? (
                <p className="rounded-control border border-dashed border-borde py-6 text-center text-pequeno text-texto-suave">
                  Sin clases
                </p>
              ) : dayClasses.length === 1 ? (
                <FannedClassCard
                  studioClass={dayClasses[0]!}
                  instructorName={instructorName(dayClasses[0]!.instructorId)}
                  capacityLabel={classOccupancyLabel(dayClasses[0]!.maxCapacity, occupancy.get(dayClasses[0]!.id))}
                  isOpen
                  {...actionHandlers}
                />
              ) : (
                <div className="relative" style={{ height: CARD_PEEK_OFFSET * (dayClasses.length - 1) + COLLAPSED_CARD_HEIGHT }}>
                  {dayClasses.map((studioClass, cardIndex) => (
                    <FannedClassCard
                      key={studioClass.id}
                      studioClass={studioClass}
                      instructorName={instructorName(studioClass.instructorId)}
                      capacityLabel={classOccupancyLabel(studioClass.maxCapacity, occupancy.get(studioClass.id))}
                      isOpen={activeId === studioClass.id}
                      stacked={{
                        index: cardIndex,
                        onEnter: () => setHoveredId(studioClass.id),
                        onLeave: () => setHoveredId((id) => (id === studioClass.id ? null : id)),
                        onToggle: () => setPinnedId((id) => (id === studioClass.id ? null : studioClass.id)),
                      }}
                      {...actionHandlers}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

/** Carta de clase en movil/tablet: toda la tarjeta es un boton que abre el modal de acciones. */
function MobileClassCard({
  studioClass,
  instructorName,
  capacityLabel,
  onOpen,
}: {
  studioClass: StudioClass;
  instructorName: string;
  capacityLabel: string;
  onOpen: (studioClass: StudioClass) => void;
}) {
  const isCancelled = studioClass.status !== "SCHEDULED";
  return (
    <button
      type="button"
      id={`class-card-mobile-${studioClass.id}`}
      onClick={() => onOpen(studioClass)}
      className={`w-full rounded-control border bg-tarjeta p-3 text-start text-pequeno shadow-card transition-colors duration-200 hover:border-acento/40 active:bg-suave ${
        isCancelled ? "border-dashed border-borde opacity-75" : "border-borde"
      }`}
    >
      <span className="block font-medium text-texto">{studioClass.title}</span>
      <span className="block tabular-nums text-texto-suave">
        {formatTime(studioClass.startsAt)}–{formatTime(studioClass.endsAt)}
      </span>
      <span className="block text-texto-suave">{instructorName}</span>
      <span className="block text-texto-suave">{capacityLabel}</span>
      {isCancelled && <span className="mt-1 block font-medium text-alerta">Cancelada</span>}
    </button>
  );
}

type StackedCardProps = {
  index: number;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: () => void;
};

/**
 * Carta de clase en escritorio. Sin `stacked`, se ve completa y quieta (el
 * unico caso de un dia con una sola clase). Con `stacked`, vive en una pila
 * en abanico: colapsada solo se ve titulo + hora; `isOpen` (hover o clic
 * fijado) la trae al frente, la agranda un poco y muestra el resto.
 */
function FannedClassCard({
  studioClass,
  instructorName,
  capacityLabel,
  isOpen,
  stacked,
  onEdit,
  onCancel,
  onDelete,
}: {
  studioClass: StudioClass;
  instructorName: string;
  capacityLabel: string;
  isOpen: boolean;
  stacked?: StackedCardProps | undefined;
} & ActionHandlers) {
  const isCancelled = studioClass.status !== "SCHEDULED";

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!stacked) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      stacked.onToggle();
    }
  }

  return (
    <article
      id={`class-card-${studioClass.id}`}
      onMouseEnter={stacked?.onEnter}
      onMouseLeave={stacked?.onLeave}
      onClick={stacked ? (event) => event.stopPropagation() : undefined}
      style={stacked ? { top: stacked.index * CARD_PEEK_OFFSET, zIndex: isOpen ? 50 : stacked.index } : undefined}
      className={`origin-top rounded-control border bg-tarjeta shadow-card transition-[transform,box-shadow] duration-300 ease-(--ease-brand) ${
        isCancelled ? "border-dashed border-borde opacity-75" : "border-borde"
      } ${stacked ? `absolute inset-x-0 ${isOpen ? "scale-[1.04] shadow-lg" : ""}` : ""}`}
    >
      <div
        role={stacked ? "button" : undefined}
        tabIndex={stacked ? 0 : undefined}
        aria-expanded={stacked ? isOpen : undefined}
        onClick={stacked ? () => stacked.onToggle() : undefined}
        onKeyDown={handleHeaderKeyDown}
        className={`px-2.5 py-2 ${stacked ? "cursor-pointer" : ""}`}
      >
        <p className="truncate text-pequeno font-medium text-texto">{studioClass.title}</p>
        <p className="tabular-nums text-[0.6875rem] text-texto-suave">
          {formatTime(studioClass.startsAt)}–{formatTime(studioClass.endsAt)}
        </p>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-(--ease-brand) ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1.5 px-2.5 pb-2.5 text-pequeno">
            <Link to={`/classes/${studioClass.id}`} className="font-medium text-acento hover:underline">
              Ver detalle
            </Link>
            <p className="text-texto-suave">{instructorName}</p>
            <p className="text-texto-suave">{capacityLabel}</p>
            {isCancelled && <p className="font-medium text-alerta">Cancelada</p>}
            <div className="-ms-1.5 flex flex-wrap gap-x-1">
              <button type="button" onClick={() => onEdit(studioClass)} className={`${actionClasses} text-acento`}>
                Editar
              </button>
              {studioClass.status === "SCHEDULED" && (
                <button type="button" onClick={() => onCancel(studioClass)} className={`${actionClasses} text-alerta`}>
                  Cancelar
                </button>
              )}
              <button type="button" onClick={() => onDelete(studioClass)} className={`${actionClasses} text-alerta`}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
