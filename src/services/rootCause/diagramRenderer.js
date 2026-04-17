/**
 * diagramRenderer — renders ASCII call-chain diagrams for distributed trace flows.
 *
 * Example output for a 4-service trace with failure in "price-engine":
 *
 *   TraceID: trc-8821
 *   ──────────────────────────────────────────────────
 *   order-gateway
 *     └─▶ trade-service
 *           └─▶ market-data-feed
 *                 └─▶ price-engine          ◀── FAILURE ORIGIN (ERROR: stale price threshold exceeded)
 *   ──────────────────────────────────────────────────
 *   Failure propagated upstream from price-engine through 3 service(s).
 */
export function renderTraceFlows(traceFlows) {
  if (!traceFlows || traceFlows.length === 0) return [];

  return traceFlows.map(renderSingleFlow);
}

function renderSingleFlow(flow) {
  const { traceId, services, events, failureOrigin, hasFailure } = flow;
  const lines = [];

  lines.push(`TraceID: ${traceId}`);
  lines.push('─'.repeat(50));

  // Build indented call chain
  for (let i = 0; i < services.length; i++) {
    const svc    = services[i];
    const indent = '  '.repeat(i);
    const prefix = i === 0 ? '' : `${indent}└─▶ `;
    const label  = `${prefix}${svc}`;

    if (svc === failureOrigin && hasFailure) {
      // Find the first ERROR message in this service for this trace
      const errEvent = events.find(e => e.service === svc && e.level === 'ERROR');
      const errMsg   = errEvent ? truncate(errEvent.message, 60) : 'ERROR detected';
      lines.push(`${label.padEnd(42)}◀── FAILURE ORIGIN (ERROR: ${errMsg})`);
    } else {
      lines.push(label);
    }
  }

  lines.push('─'.repeat(50));

  if (hasFailure && failureOrigin) {
    const propagationDepth = services.indexOf(failureOrigin);
    if (propagationDepth > 0) {
      lines.push(`Failure propagated upstream from ${failureOrigin} through ${propagationDepth} service(s).`);
    } else {
      lines.push(`Failure originated in the entry service: ${failureOrigin}.`);
    }
  } else {
    lines.push(`No ERROR detected in this trace — all ${services.length} services completed successfully.`);
  }

  return {
    traceId,
    hasFailure,
    failureOrigin,
    diagram:   lines.join('\n'),
    services,
    eventCount: events.length,
  };
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length <= maxLen ? str : `${str.slice(0, maxLen - 1)}…`;
}
