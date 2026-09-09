import { useState } from "react";
import { createEnrollmentRequest } from "../services/academyEnrollmentService";

export function useEnrollDependent() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll(businessId: string, dependentId: string, groupId: string): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await createEnrollmentRequest(businessId, dependentId, groupId);
    } catch (err) {
      setError("No se pudo enviar la solicitud de inscripción.");
      console.error("[academy] createEnrollmentRequest fallo", err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, enroll };
}
