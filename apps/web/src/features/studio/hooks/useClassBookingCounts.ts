import { useCallback, useEffect, useState } from "react";
import { getClassBookingCounts } from "../services/studioClassesService";

/** Reservas de todos los clientes por clase, para saber si una clase ya esta llena. */
export function useClassBookingCounts(classIds: string[]) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  // Clave estable: el arreglo cambia de identidad en cada render.
  const idsKey = classIds.join(",");

  const reload = useCallback(async () => {
    try {
      setCounts(await getClassBookingCounts(idsKey ? idsKey.split(",") : []));
    } catch (err) {
      // Sin conteo se cae al comportamiento anterior; book_class sigue validando el cupo.
      console.error("[studio] class_booking_counts fallo", err);
    }
  }, [idsKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { counts, reload };
}
