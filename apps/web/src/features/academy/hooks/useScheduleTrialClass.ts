import { useState } from "react";
import { createTrialClassRequest } from "../services/academyEnrollmentService";

export function useScheduleTrialClass() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scheduleTrial(
    businessId: string,
    dependentId: string,
    groupId: string,
    scheduleId: string,
    trialDate: string,
  ): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await createTrialClassRequest(businessId, dependentId, groupId, scheduleId, trialDate);
    } catch (err) {
      setError("No se pudo agendar la clase muestra.");
      console.error("[academy] createTrialClassRequest fallo", err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, scheduleTrial };
}
