# Privacidad y Términos — Plan y Bloqueos

Jurisdicción: México (LFPDPPP). Dueño de esta área: front-end + redacción
de políticas. Este documento es solo el tracking de qué se necesita y qué
falta — no contiene el texto legal (se redacta aparte cuando ya no haya
bloqueos).

## Políticas requeridas

| Política | Por qué (arquitectura) | Obligatoria |
|---|---|---|
| Aviso de Privacidad Integral | Supabase Auth + `profiles` + `payments` + `academy_enrollments` guardan dato personal desde el registro | Sí (LFPDPPP Art. 15-19) |
| Aviso de Privacidad Simplificado | Se recaba dato en 2 puntos: registro y checkout Stripe | Sí |
| Términos y Condiciones | Sustento contractual de créditos, cancelaciones y bajas por impago (`docs/business-rules.md`) | De facto (LFPC) |
| Política de Cookies | Hoy solo hay sesión de Supabase Auth (cookie técnica, sin banner). Banner solo si se agrega tracking no esencial | Sí, mínima |
| Consentimiento de tutor (menor, Academia) | Academia de danza probablemente inscribe menores; consentimiento lo da el tutor, no el menor (Reglamento LFPDPPP Art. 16) | Sí, si aplica |

## Estado actual del proyecto (verificado en código, no solo en docs)

- `supabase/migrations/`: vacío (solo README). No existen `business` ni
  `profiles`.
- `apps/web/src/routes/`: vacío. No hay router configurado.
- `apps/web/src/features/auth|academy|payments/`: vacíos (solo README).
  No hay formulario de registro, inscripción ni checkout.

## Bloqueado por negocio (para cerrar el texto legal)

- [ ] Razón social, RFC, domicilio fiscal, correo de contacto de
      privacidad, ciudad/estado de jurisdicción.
- [ ] Confirmar si la Academia inscribe menores, quién puede registrarlos
      (tutor) y qué datos del tutor se piden — **no está documentado
      todavía en `docs/business-rules.md`**, es una suposición a validar.
- [ ] Ventana de cancelación, ventana de confirmación de waitlist, días de
      gracia de colegiatura (ya marcados como pendientes en
      `docs/business-rules.md`).
- [ ] Proveedor final de WhatsApp y de email (no bloquea redactar, sí
      bloquea publicar el dato exacto).

## Bloqueado por desarrollo (para poder implementar el frontend)

- [ ] Router base en `apps/web/src/routes/` (soporte de rutas públicas).
- [ ] Migraciones `business`, `profiles`, y tabla `legal_consents`
      (versión de aviso/términos aceptada por usuario).
- [ ] `CustomerRegistrationForm` (feature `auth`) — donde va el checkbox
      de consentimiento.
- [ ] Formulario de inscripción (feature `academy`) — donde va el
      checkbox de consentimiento del tutor.
- [ ] Checkout de Stripe (feature `payments`) — donde va el aviso previo
      al pago.

## Se puede avanzar ya, sin esperar a nadie

- Redactar el texto legal en cuanto se resuelvan los pendientes de
  "Bloqueado por negocio".
- Construir como componentes sueltos (sin conectar a Supabase ni a un
  form real todavía): páginas `/legal/*`, `LegalFooterLinks`,
  `LegalConsentCheckbox`, `GuardianConsentCheckbox`.

## Siguiente paso

Llevar la lista "Bloqueado por negocio" y "Bloqueado por desarrollo" al
equipo. En cuanto se resuelvan, actualizar este archivo marcando cada
checkbox.
