/**
 * ROOT_CAUSE_PATTERNS — maps observable error signals to likely root causes.
 *
 * Each pattern has:
 *  - id:            unique identifier
 *  - keywords:      strings searched in incident title + description + log messages
 *  - failureDomain: high-level domain label shown to the engineer
 *  - hypothesis:    concise 1–2 sentence root cause hypothesis
 *  - nextSteps:     ordered engineer actions to confirm and remediate
 *  - remediation:   short fix summary
 */
export const ROOT_CAUSE_PATTERNS = [
  {
    id:            'feed_provider_outage',
    keywords:      ['stale', 'stale price', 'feed', 'price lag', 'expired', 'feed handler', 'upstream feed', 'provider'],
    failureDomain: 'market data feed',
    hypothesis:    'The upstream feed provider stopped delivering price updates. The feed handler detected staleness and halted price-engine ingestion, causing downstream components to reject quotes and orders.',
    nextSteps: [
      'Check the feed provider status page and any SLA alert emails.',
      'Inspect feed-handler ERROR logs for "upstream connection lost" or heartbeat timeouts.',
      'Verify price-engine staleness threshold — confirm it is not misconfigured too aggressively.',
      'Manually replay a snapshot feed if available to restore prices while awaiting provider recovery.',
      'If provider is healthy, rotate the feed connection (disconnect/reconnect) to clear any TCP half-open state.',
    ],
    remediation: 'Restore upstream feed connectivity or switch to backup provider; clear stale-price cache after recovery.',
  },
  {
    id:            'database_connection_pool',
    keywords:      ['pool exhausted', 'too many connections', 'connection pool', 'deadlock', 'lock wait', 'db', 'database', 'sql', 'replication lag'],
    failureDomain: 'database / storage layer',
    hypothesis:    'The database connection pool is saturated. Requests queue behind the pool limit, causing timeouts in upstream services. A recent traffic spike, slow query, or connection leak is the likely trigger.',
    nextSteps: [
      'Check current active DB connections vs. pool max in the DB admin console.',
      'Run SHOW PROCESSLIST (MySQL) or pg_stat_activity (Postgres) to identify long-running or blocking queries.',
      'Look for deadlock events in the DB error log — resolve by killing the blocking session.',
      'Review query execution plans for any full-table scans introduced by a recent schema change.',
      'Tune pool size or add read-replica routing if connection count is structurally too low for load.',
    ],
    remediation: 'Kill blocking queries, increase pool size temporarily, and deploy a fix for any connection leak.',
  },
  {
    id:            'memory_leak_oom',
    keywords:      ['out of memory', 'oom', 'heap', 'gc pressure', 'gc', 'memory leak', 'container restart', 'evicted', 'resource exhausted'],
    failureDomain: 'runtime memory / JVM heap',
    hypothesis:    'A memory leak is causing gradual heap growth. GC pressure eventually stalls the JVM/Node process; the container is killed and restarted by the orchestrator, causing brief service interruption.',
    nextSteps: [
      'Compare heap baseline (from previous day) with current heap snapshot to quantify growth rate.',
      'Review GC pause logs — sustained >500 ms pauses before OOM are a strong signal.',
      'Check for unbounded caches, event-listener accumulation, or retained closures in recent code changes.',
      'Take a heap dump at 80% utilisation and analyse with Eclipse MAT or Chrome DevTools.',
      'Increase memory limit temporarily to restore stability while investigating the leak.',
    ],
    remediation: 'Deploy a fix for the leak; add memory circuit-breaker to restart pod before OOM if needed.',
  },
  {
    id:            'auth_signing_key_rotation',
    keywords:      ['401', '403', 'unauthorized', 'forbidden', 'jwt', 'token', 'signing key', 'auth', 'invalid token', 'permission denied'],
    failureDomain: 'auth-service / JWT signing',
    hypothesis:    'A JWT signing key rotation invalidated all existing tokens simultaneously. Services presenting old tokens receive 401/403 responses, causing authentication failures across the platform.',
    nextSteps: [
      'Check auth-service key rotation audit log — confirm a new signing key was deployed recently.',
      'Verify all services consuming JWTs have picked up the new public key (JWKS endpoint or config update).',
      'Force-invalidate any internal service-to-service token caches that may hold old tokens.',
      'Confirm token TTL — if short (< 15 min), recovery is automatic as clients re-authenticate.',
      'If key was rotated in error, roll back to the previous key and re-rotate on a coordinated schedule.',
    ],
    remediation: 'Distribute new public key to all consumers; clear token caches; coordinate future rotations.',
  },
  {
    id:            'cascade_from_single_dependency',
    keywords:      ['cascade', 'dependency', 'downstream', 'circuit breaker', 'circuit open', 'fallback', 'degraded', 'partial outage', 'propagation'],
    failureDomain: 'service dependency graph',
    hypothesis:    'A single service failure propagated upstream through synchronous dependency chains. Circuit breakers were either absent or did not trigger fast enough, turning a leaf-node failure into a platform-wide outage.',
    nextSteps: [
      'Use distributed traces (traceId correlation) to identify the origin service — it has the earliest ERROR timestamp.',
      'Confirm circuit breaker state on all affected services — open breakers validate the cascade path.',
      'Isolate the failing root service to prevent further propagation (disable routing, return 503).',
      'Check if the failing service has an async or cached fallback that can restore partial functionality.',
      'Post-incident: add bulkhead patterns (thread pool isolation) between high-risk dependency pairs.',
    ],
    remediation: 'Restore the origin service; open circuit breakers manually if needed; enable fallbacks.',
  },
  {
    id:            'order_gateway_validation',
    keywords:      ['order rejected', 'rejection', 'reject', 'fill rate', 'trade fail', 'order fail', 'validation error', 'bad input'],
    failureDomain: 'matching-engine / order-gateway',
    hypothesis:    'The order-gateway is rejecting orders due to stale reference data or a recent validation rule change. A high fill-rate decline confirms systematic rejection rather than individual user error.',
    nextSteps: [
      'Group order-gateway rejection logs by reason code — the dominant code identifies the failure mode.',
      'Check whether reference data (instruments, limits, margin tables) was refreshed recently.',
      'Verify that market-data-feed prices are current — stale quotes cause price-boundary rejections.',
      'Review any validation rule configuration deployed in the last 24 hours.',
      'If rejections are confined to a single instrument class, isolate that class and enable manual processing.',
    ],
    remediation: 'Refresh stale reference data or revert the validation rule change; monitor fill rate recovery.',
  },
  {
    id:            'network_partition',
    keywords:      ['timeout', 'connection refused', 'socket', 'unreachable', 'connection reset', 'timed out', 'network', 'dns'],
    failureDomain: 'network / service mesh',
    hypothesis:    'A network partition or DNS failure is severing communication between services. The pattern of timeouts across multiple unrelated services points to infrastructure rather than application code.',
    nextSteps: [
      'Check service mesh (Envoy/Istio) error rates and sidecar proxy logs for connection refused events.',
      'Verify DNS resolution from affected pods — `nslookup <service-name>` inside a container.',
      'Inspect network ACLs and security groups for recent changes that may have blocked inter-service traffic.',
      'Check cloud provider network status page for regional issues.',
      'If a specific AZ is affected, trigger AZ failover and re-route traffic to healthy zones.',
    ],
    remediation: 'Restore DNS or network path; re-route traffic away from affected AZ; patch ACL if misconfigured.',
  },
  {
    id:            'rate_limit_exhaustion',
    keywords:      ['429', 'rate limit', 'throttle', 'throttled', 'quota', 'too many requests', 'rate exceeded'],
    failureDomain: 'api gateway / rate limiter',
    hypothesis:    'A single client or service is exhausting shared API quota, causing 429 responses for other callers. This is often caused by a retry storm — exponential backoff without jitter amplifies rate-limit violations.',
    nextSteps: [
      'Identify the offending client by sorting the API gateway 429 log by client-id or IP.',
      'Check if the client implemented exponential backoff with jitter — absence of jitter causes thundering-herd.',
      'Determine whether a recent release triggered increased call volume from the client.',
      'Apply a per-client rate-limit override to isolate the misbehaving caller without affecting others.',
      'Review global quota configuration — if legitimate traffic grew beyond limits, increase quota.',
    ],
    remediation: 'Throttle the offending client; implement backoff with jitter; raise quota if growth is legitimate.',
  },
];
