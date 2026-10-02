import { useState } from "react";
import {
  createEnrollmentRequest,
  createRegistrationCheckoutSession,
} from "../services/academyEnrollmentService";

export function useEnrollDependent() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Crea la solicitud PENDIENTE y redirige al Stripe Checkout hosted para
   * cobrar la cuota de inscripcion. Al redirigir, la pagina se descarga --
   * no hay "onSuccess" que llamar aqui, el pago se confirma despues via
   * stripe-webhook (ver docs/payments.md).
   */
  async function enroll(businessId: string, dependentId: string, groupId: string): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const enrollmentId = await createEnrollmentRequest(businessId, dependentId, groupId);
      const checkoutUrl = await createRegistrationCheckoutSession(enrollmentId);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError("No se pudo iniciar el pago de la inscripción.");
      console.error("[academy] enroll fallo", err);
      setSubmitting(false);
      throw err;
    }
  }

  return { submitting, error, enroll };
}
