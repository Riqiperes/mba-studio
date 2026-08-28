# Notificaciones

## Principio

La logica de negocio genera un evento/notificacion; un proveedor decide
como enviarlo (email, WhatsApp, y en el futuro push). La logica de negocio
nunca sabe si el mensaje termina siendo un correo o un WhatsApp.

## Tipos de notificacion

- Nuevo pago recibido (aviso interno/admin).
- Confirmacion de pago (al cliente).
- Recordatorio de clase / colegiatura.
- Cupo liberado en lista de espera.
- Cancelacion de clase o de reservacion.
- Aviso de clase (cambio de horario, instructor, etc.).
- Pago atrasado (colegiatura).
- Baja de inscripcion.

## Arquitectura

```
Evento de negocio (ej. pago confirmado)
        v
notifications (Edge Function) arma el mensaje segun el tipo de evento
        v
Envia via EmailProvider y/o WhatsAppProvider activo
```

Cada tipo de notificacion define su propia plantilla de contenido (a
implementar); el canal (email/WhatsApp) es una decision de configuracion,
no de la logica de negocio que dispara el evento.

## Relacion con WhatsApp

Ver `docs/whatsapp.md` para el detalle de la abstraccion `NotificationProvider`
que desacopla el proveedor concreto de WhatsApp.

## Estado actual

No implementado todavia. `supabase/functions/notifications/` existe como
carpeta preparada. Se implementa en la etapa "Notifications" del roadmap.
