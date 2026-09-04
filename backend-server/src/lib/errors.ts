export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Client-facing 500 text. Validation (4xx) should keep using errorMessage. */
export function clientError(error: unknown, fallback = 'Server error'): string {
  if (process.env.NODE_ENV === 'production') return fallback;
  return errorMessage(error);
}
