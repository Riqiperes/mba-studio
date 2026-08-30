/**
 * `supabase.rpc()`/`.from()` errors (PostgrestError) are plain objects at
 * runtime, not `Error` instances, despite the postgrest-js source declaring
 * `class PostgrestError extends Error` -- verified live against this
 * project's installed @supabase/supabase-js: `error instanceof Error` is
 * false for every RPC/query error, so a bare `err instanceof Error` check
 * silently swallows every Postgres `raise exception` message (cupo lleno,
 * sin creditos, no autorizado, etc.) behind a generic fallback. Duck-typing
 * on `message` handles both real Error instances and Postgrest error
 * objects.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}
