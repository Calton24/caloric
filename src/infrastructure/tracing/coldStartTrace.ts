/**
 * Cold-start trace id.
 *
 * Generated once per app process (module-scoped). Every step of the
 * cold-start auth/profile/routing pipeline tags its [ColdStartTrace]
 * log lines with this id so the entire chain can be reconstructed
 * from device logs.
 *
 * On hot reload this module re-evaluates → new id, which is what we
 * want (each reload is a fresh "cold start" from the JS runtime's
 * perspective).
 */

function generateTraceId(): string {
  // Random 8-char base36; collision-irrelevant for client-side log tagging.
  const rand = Math.floor(Math.random() * 36 ** 8)
    .toString(36)
    .padStart(8, "0");
  const ts = Date.now().toString(36);
  return `cs_${ts}_${rand}`;
}

export const COLD_START_TRACE_ID = generateTraceId();

/**
 * Convenience wrapper so call sites stay short and consistent.
 * Always tags the log with the shared trace id and the step name.
 */
export function logColdStartStep(
  step: string,
  data: Record<string, unknown>
): void {
  if (!__DEV__) return;
  console.log("[ColdStartTrace]", {
    traceId: COLD_START_TRACE_ID,
    step,
    ...data,
  });
}
