// Server-side error helpers. Keep DB/PostgREST details in server logs only,
// and return short generic messages to clients.

export function safeError(
  context: string,
  error: unknown,
  clientMessage = "Something went wrong. Please try again.",
): Error {
  // Log full details server-side for debugging.
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, error);
  return new Error(clientMessage);
}

// Escape characters that have special meaning in PostgREST filter strings
// (used inside .or() / .ilike() interpolations) to prevent users from
// injecting extra filter clauses via commas, parentheses, or operators.
export function escapePostgrestLiteral(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/[%_]/g, "")
    .replace(/[(),]/g, " ")
    .replace(/"/g, '""')
    .trim();
}
