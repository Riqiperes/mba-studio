import type { ClassOccupancy } from "../types/StudioClass";

/** "Cupo 3/10 · 2 en espera"; sin datos de ocupacion aun, solo "Cupo 10". */
export function classOccupancyLabel(maxCapacity: number, occupancy: ClassOccupancy | undefined): string {
  if (!occupancy) return `Cupo ${maxCapacity}`;
  const waiting = occupancy.waiting > 0 ? ` · ${occupancy.waiting} en espera` : "";
  return `Cupo ${occupancy.booked}/${maxCapacity}${waiting}`;
}
