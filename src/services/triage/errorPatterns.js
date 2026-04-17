/**
 * ERROR_PATTERNS — investigation knowledge base for common web/trading-platform errors.
 *
 * Each pattern maps observable keywords to a set of ordered investigation steps.
 * Add new patterns here as the system learns new failure modes.
 *
 * Future: business-error patterns loaded from businessErrorDictionary.json.
 * Future: technical patterns enriched by LLM web search.
 */
export const ERROR_PATTERNS = [
  {
    id:            'connection_timeout',
    keywords:      ['timeout', 'connection refused', 'connection reset', 'unreachable', 'socket', 'timed out'],
    failureDomain: 'network / service mesh',
    steps: [
      { action: 'Check downstream service health endpoints', rationale: 'Timeouts most often indicate the target service is overloaded or down.', logsToCheck: ['WARN/ERROR logs of the calling service', 'health check responses of the target'] },
      { action: 'Review recent deployments or config changes', rationale: 'Timeout threshold changes or new circuit-breaker configs can trigger this.', logsToCheck: ['deployment logs', 'config change audit trail'] },
      { action: 'Check network latency metrics between services', rationale: 'Network congestion or DNS failures can appear as timeouts.', logsToCheck: ['service mesh latency dashboards', 'DNS query logs'] },
    ],
  },
  {
    id:            'stale_price',
    keywords:      ['stale', 'stale price', 'stale data', 'price lag', 'latency', 'old price', 'expired', 'staleness'],
    failureDomain: 'data feed / price engine',
    steps: [
      { action: 'Check market-data-feed handler latency', rationale: 'Stale prices originate at the feed layer. Confirm upstream provider connectivity.', logsToCheck: ['market-data-feed ERROR logs', 'feed handler latency metrics'] },
      { action: 'Verify price-engine staleness threshold config', rationale: 'A misconfigured threshold rejects valid prices.', logsToCheck: ['price-engine config', 'price-engine WARN logs'] },
      { action: 'Check for upstream feed provider incidents', rationale: 'Feed provider outages produce batch staleness across all instruments.', logsToCheck: ['feed provider status page', 'market-data-feed upstream connection logs'] },
    ],
  },
  {
    id:            'auth_failure',
    keywords:      ['401', '403', 'unauthorized', 'forbidden', 'token', 'jwt', 'auth', 'permission denied', 'access denied', 'invalid token'],
    failureDomain: 'auth-service / identity',
    steps: [
      { action: 'Check auth-service error rate and token validation logs', rationale: '401/403 spikes usually mean token expiry, signing key rotation, or auth-service overload.', logsToCheck: ['auth-service ERROR logs', 'token validation failure counts'] },
      { action: 'Verify JWT signing keys and expiry config', rationale: 'A rolled signing key invalidates all existing tokens simultaneously.', logsToCheck: ['auth-service config', 'key rotation audit log'] },
      { action: 'Check downstream service ACL / permission config', rationale: 'A 403 can also come from misconfigured ACLs on the receiving service.', logsToCheck: ['target service access control logs', 'recent permission config changes'] },
    ],
  },
  {
    id:            'resource_exhaustion',
    keywords:      ['out of memory', 'oom', 'heap', 'gc', 'gc pressure', 'cpu', 'thread pool', 'queue full', 'backpressure', 'resource exhausted', 'memory'],
    failureDomain: 'runtime / infrastructure',
    steps: [
      { action: 'Check JVM/Node heap and GC metrics', rationale: 'Heap exhaustion causes latency spikes before OOM kills.', logsToCheck: ['runtime memory metrics', 'GC pause duration logs'] },
      { action: 'Review thread pool / event loop saturation', rationale: 'Thread starvation queues requests and manifests as timeouts upstream.', logsToCheck: ['thread pool utilisation metrics', 'event loop lag (Node.js)'] },
      { action: 'Check for memory leak — compare heap baseline vs current', rationale: 'Gradual heap growth over hours indicates a leak in a long-lived object.', logsToCheck: ['heap snapshots', 'container memory usage over time'] },
    ],
  },
  {
    id:            'database_error',
    keywords:      ['database', 'db', 'sql', 'query', 'deadlock', 'lock wait', 'connection pool', 'too many connections', 'replication lag', 'pool exhausted'],
    failureDomain: 'database / storage layer',
    steps: [
      { action: 'Check DB connection pool saturation', rationale: 'Pool exhaustion queues or rejects queries, appearing as latency or errors upstream.', logsToCheck: ['connection pool metrics', 'DB slow query log'] },
      { action: 'Look for deadlocks or long-running transactions', rationale: 'Deadlocks cascade — one blocked transaction holds locks that stall others.', logsToCheck: ['DB deadlock logs', 'active transaction list'] },
      { action: 'Check replication lag if read replicas are in use', rationale: 'Replica lag causes stale reads which can appear as data consistency errors.', logsToCheck: ['replication lag metrics', 'read replica error logs'] },
    ],
  },
  {
    id:            'order_rejection',
    keywords:      ['order rejected', 'rejection', 'reject', 'fill rate', 'order fail', 'trade fail', 'rejected'],
    failureDomain: 'matching-engine / order-gateway',
    steps: [
      { action: 'Check order-gateway validation error logs', rationale: 'Rejections at the gateway indicate bad input or stale reference data.', logsToCheck: ['order-gateway ERROR logs', 'validation failure counters'] },
      { action: 'Inspect matching-engine rejection reason codes', rationale: 'The engine stamps a reason code on each rejection — group by code to identify the dominant failure.', logsToCheck: ['matching-engine rejection logs', 'reason code frequency'] },
      { action: 'Correlate with market-data-feed latency', rationale: 'Many rejections are caused by stale prices.', logsToCheck: ['market-data-feed latency metrics', 'price staleness counters'] },
    ],
  },
  {
    id:            'rate_limit',
    keywords:      ['429', 'rate limit', 'throttle', 'throttled', 'quota', 'too many requests'],
    failureDomain: 'api gateway / rate limiter',
    steps: [
      { action: 'Identify which client or service is being throttled', rationale: 'A single misbehaving client can exhaust shared quota and impact others.', logsToCheck: ['API gateway 429 logs', 'per-client request rate metrics'] },
      { action: 'Check if rate limit config was recently changed', rationale: 'A quota reduction without coordinating with clients causes sudden throttling.', logsToCheck: ['rate limiter config audit log', 'recent config deployments'] },
    ],
  },
  {
    id:            'cascade_failure',
    keywords:      ['cascade', 'dependency', 'downstream', 'circuit breaker', 'fallback', 'degraded', 'partial outage', 'circuit'],
    failureDomain: 'service dependency graph',
    steps: [
      { action: 'Map the affected services against the service topology', rationale: 'Cascades propagate upstream — identify the origin node in the dependency graph.', logsToCheck: ['service topology map', 'error timestamps across services (find the earliest)'] },
      { action: 'Check circuit breaker states on affected services', rationale: 'An open circuit breaker confirms the dependency is unhealthy.', logsToCheck: ['circuit breaker state logs', 'retry attempt counters'] },
      { action: 'Isolate the root failing service by tracing the earliest error timestamp', rationale: 'The service with the earliest ERROR timestamp is usually the origin.', logsToCheck: ['distributed trace (traceId correlation)', 'service error timeline'] },
    ],
  },
  {
    id:            'unknown',
    keywords:      [],
    failureDomain: 'unknown — requires manual investigation',
    steps: [
      { action: 'Collect full logs from all affected services for the incident time window', rationale: 'No known pattern matched. Cast a wide net first.', logsToCheck: ['all affected service logs', 'infrastructure metrics'] },
      { action: 'Check for recent deployments or config changes across affected services', rationale: 'The majority of production incidents are caused by recent changes.', logsToCheck: ['deployment pipeline logs', 'config change audit trail'] },
      { action: 'Correlate with any open alerts or monitoring dashboards', rationale: 'Other signals may reveal the failure domain before log triage completes.', logsToCheck: ['alerting system', 'observability dashboards'] },
    ],
  },
];
