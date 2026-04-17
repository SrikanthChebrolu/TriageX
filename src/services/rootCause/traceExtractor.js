/**
 * traceExtractor — groups logs by traceId and reconstructs distributed call flows.
 *
 * For each traceId that spans multiple services, it produces:
 *  - traceId:       the distributed trace identifier
 *  - services:      ordered list of unique services involved (by first log timestamp)
 *  - events:        all log entries in this trace, sorted by timestamp
 *  - failureOrigin: the service that logged the first ERROR in this trace
 *  - hasFailure:    boolean — true when at least one ERROR log exists in the trace
 */
export function extractTraceFlows(logs) {
  if (!logs || logs.length === 0) return [];

  // Group logs by traceId (only logs that have a traceId)
  const traceMap = new Map();
  for (const log of logs) {
    if (!log.traceId) continue;
    if (!traceMap.has(log.traceId)) {
      traceMap.set(log.traceId, []);
    }
    traceMap.get(log.traceId).push(log);
  }

  const flows = [];

  for (const [traceId, entries] of traceMap) {
    // Sort entries by timestamp ascending
    const sorted = [...entries].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Only include traces that span multiple services (cross-service flows)
    const serviceSet = new Set(sorted.map(e => e.service));
    if (serviceSet.size < 2) continue;

    // Build ordered service list (order of first appearance)
    const serviceOrder = [];
    for (const entry of sorted) {
      if (!serviceOrder.includes(entry.service)) {
        serviceOrder.push(entry.service);
      }
    }

    // Find the first ERROR in this trace — that is the failure origin
    const firstError   = sorted.find(e => e.level === 'ERROR');
    const failureOrigin = firstError?.service ?? null;

    flows.push({
      traceId,
      services:      serviceOrder,
      events:        sorted,
      failureOrigin,
      hasFailure:    !!firstError,
    });
  }

  // Return traces with failures first, then multi-service traces without failures
  return flows.sort((a, b) => {
    if (a.hasFailure && !b.hasFailure) return -1;
    if (!a.hasFailure && b.hasFailure) return 1;
    return b.services.length - a.services.length;
  });
}
