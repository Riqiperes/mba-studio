// Logging estructurado minimo. Nunca recibe ni imprime secretos (API
// keys, service role key, tokens): solo datos de negocio (tipo de evento,
// destinatario ofuscado, proveedor).
export function logEvent(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...data, at: new Date().toISOString() }));
}

export function logError(event: string, error: unknown, data: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event, error: message, ...data, at: new Date().toISOString() }));
}
