/**
 * Forma de la configuracion white-label de un negocio (ver docs/white-label.md).
 *
 * Todavia no hay tabla `business` ni endpoint que devuelva esto: es el
 * contrato que ese endpoint/tabla debera cumplir cuando se implemente, para
 * que apps/web y apps/admin puedan compartir el mismo tipo desde ya.
 */
export type BusinessConfig = {
  id: string;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  description: string | null;
};
