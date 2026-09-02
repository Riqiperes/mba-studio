/**
 * Roles soportados por la plataforma (ver CLAUDE.md y docs/authentication.md).
 *
 * IMPORTANTE: este tipo es solo para tipar la UI. El rol real de un usuario
 * nunca se confia desde el frontend: siempre se valida contra la base de
 * datos (tabla profiles) protegida por RLS. Ver docs/security.md.
 */
export type UserRole = "CUSTOMER" | "STAFF" | "BUSINESS_ADMIN" | "SUPER_ADMIN" | "INSTRUCTOR_ADMIN";
