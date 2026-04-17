/** Central registry of all TanStack Query keys. Never inline query key strings. */
export const QUERY_KEYS = {
  triage:    ['triage']    as const,
  rootCause: ['rootCause'] as const,
  logs:      ['logs']      as const,
} as const;
