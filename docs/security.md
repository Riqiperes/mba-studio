# Seguridad

## Principios

1. Nunca confiar en el frontend para decisiones de autorizacion o de pago.
2. RLS (Row Level Security) obligatorio en toda tabla de Postgres. Nunca se
   desactiva para "solucionar" un bug: el bug se arregla ajustando la
   policy.
3. Los roles (`CUSTOMER`, `STAFF`, `BUSINESS_ADMIN`, `SUPER_ADMIN`) se
   verifican server-side (RLS y/o Edge Functions), nunca solo en el
   frontend.

## RLS — reglas por rol (a implementar junto con cada tabla)

- **Customer**: puede leer/modificar unicamente sus propios datos (su
  perfil, sus bookings, sus pagos, su inscripcion de academia). No puede
  leer datos de otro customer.
- **Business Admin / Staff**: puede administrar unicamente los datos cuyo
  `business_id` coincide con el negocio al que pertenece.
- **Super Admin**: puede administrar todos los negocios (rol preparado,
  sin UI todavia — ver `docs/white-label.md`).

La seguridad debe sostenerse aunque alguien llame directamente a la API de
Supabase con la anon key, sin pasar por la UI.

## Secretos

- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  credenciales de WhatsApp/email: solo como secrets de Supabase Edge
  Functions. Nunca en el frontend, nunca en variables `VITE_*`, nunca
  committeados.
- `.env`, `.env.local` y variantes estan en `.gitignore`. Solo
  `.env.example` (sin valores reales) se versiona.

## Validacion

Los datos se validan en frontend (UX) y en backend/Edge Function (verdad),
usando Zod donde aplique. Nunca se asume que un payload del frontend es
confiable, incluso si el frontend "ya valido".

## Manejo de errores

Errores claros, consistentes y seguros: nunca se expone informacion
sensible (stack traces, detalles de infraestructura, claves) al usuario
final. Categorias con tratamiento consistente: errores de API, de
validacion, de autenticacion, de pago, de reservacion.

## Logging

Logging estructurado. Nunca se registra: passwords, secret keys, tokens de
sesion/API, informacion financiera sensible (numeros de tarjeta, etc.).

## Estado actual

Documento de referencia para cuando se implementen Auth, RLS y Edge
Functions. Todavia no hay tablas ni policies (ver `docs/database.md`).
