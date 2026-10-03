// Requisitos de contrasena para registro y cambio de contrasena. El mismo
// arreglo valida y pinta la lista en pantalla, para que nunca se
// desincronicen. Debe coincidir con Supabase > Providers > Email (minimo 8,
// "Letters and digits"), ver docs/authentication.md.
export const PASSWORD_REQUIREMENTS = [
  { label: "Al menos 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Al menos una letra", test: (value: string) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value) },
  { label: "Al menos un número", test: (value: string) => /\d/.test(value) },
];

export function meetsPasswordRequirements(value: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(value));
}
