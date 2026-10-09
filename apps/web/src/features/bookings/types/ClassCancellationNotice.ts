// apps/web/src/features/bookings/types/ClassCancellationNotice.ts

/** Aviso de clase cancelada por la academia para quien estaba en lista de espera. */
export type ClassCancellationNotice = {
  id: string;
  classTitle: string;
  startsAt: string;
};
