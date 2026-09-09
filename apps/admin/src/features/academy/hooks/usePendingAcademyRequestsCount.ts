import { useCallback, useEffect, useState } from "react";
import { countPendingAcademyRequests } from "../services/academyEnrollmentsService";

export function usePendingAcademyRequestsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setCount(await countPendingAcademyRequests());
    } catch (err) {
      console.error("[academy] countPendingAcademyRequests fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { count, loading, reload };
}
