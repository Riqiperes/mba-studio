import { useEffect, useState } from "react";
import { listClassOccupancy } from "../services/classesService";
import type { ClassOccupancy } from "../types/StudioClass";

/** Reservados y lista de espera por clase, para mostrar el cupo en el calendario. */
export function useClassOccupancy(classIds: string[]) {
  const [occupancy, setOccupancy] = useState<Map<string, ClassOccupancy>>(new Map());
  const key = classIds.join(",");

  useEffect(() => {
    if (!key) {
      setOccupancy(new Map());
      return;
    }
    let cancelled = false;
    listClassOccupancy(key.split(","))
      .then((result) => {
        if (!cancelled) setOccupancy(result);
      })
      .catch((err) => console.error("[classes] listClassOccupancy fallo", err));
    return () => {
      cancelled = true;
    };
  }, [key]);

  return occupancy;
}
