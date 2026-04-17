# Requirement 04 — Seed Data

## Overview

All seed data is stored as **JSON files** under `src/data/`. Each file exports a plain
array or object — no database, no ORM, no migration scripts. Data is loaded once at
startup and held in memory for the lifetime of the process.

The data models a **distributed, horizontally-scaled trading platform** running multiple
instances of each service, all connected to high-volume databases. Log entries reflect
realistic distributed-system failure modes: inter-instance race conditions, connection
pool exhaustion across replicas, split-brain scenarios, cascading timeouts, and
retry storms.

---

## File Structure

```
src/
  data/
    incidents.json          # 10+ historical incidents with full triage metadata
    logs.json               # sample log batches (6 realistic failure scenarios)
    serviceTopology.json    # service dependency graph with instance counts + DB info
    index.js                # loader — reads JSON files, exports typed factory functions
```

---

## 1. Service Topology — `serviceTopology.json`

Describes every service: its dependencies, how many instances run in production,
which databases it connects to, and what its SLA/SLO targets are.
This is the reference map used by triage and root-cause modules when reasoning
about blast radius and investigation starting points.

```json
{
  "services": {
    "order-gateway": {
      "description": "Inbound order entry — validates and routes client orders",
      "instances": 6,
      "dependsOn": ["auth-service", "matching-engine", "market-data-feed", "risk-engine"],
      "databases": [
        { "name": "orders-db", "type": "PostgreSQL", "role": "primary", "poolSize": 20 }
      ],
      "slo": { "latencyP99Ms": 50, "errorRatePct": 0.1 }
    },
    "matching-engine": {
      "description": "Core order matching — pairs bids and offers at price/time priority",
      "instances": 4,
      "dependsOn": ["market-data-feed", "trade-reporting", "risk-engine"],
      "databases": [
        { "name": "orderbook-db", "type": "PostgreSQL", "role": "primary", "poolSize": 40 },
        { "name": "orderbook-cache", "type": "Redis", "role": "cache", "poolSize": 10 }
      ],
      "slo": { "latencyP99Ms": 10, "errorRatePct": 0.01 }
    },
    "market-data-feed": {
      "description": "Normalises and distributes real-time price data from external providers",
      "instances": 3,
      "dependsOn": ["price-engine"],
      "databases": [
        { "name": "prices-db", "type": "TimescaleDB", "role": "primary", "poolSize": 15 },
        { "name": "prices-cache", "type": "Redis", "role": "cache", "poolSize": 8 }
      ],
      "slo": { "latencyP99Ms": 20, "errorRatePct": 0.05 }
    },
    "price-engine": {
      "description": "Calculates derived prices, mid-rates, and spread adjustments",
      "instances": 3,
      "dependsOn": [],
      "databases": [
        { "name": "reference-data-db", "type": "PostgreSQL", "role": "primary", "poolSize": 10 }
      ],
      "slo": { "latencyP99Ms": 15, "errorRatePct": 0.02 }
    },
    "auth-service": {
      "description": "JWT issuance, validation, and session management",
      "instances": 4,
      "dependsOn": [],
      "databases": [
        { "name": "auth-db", "type": "PostgreSQL", "role": "primary", "poolSize": 30 },
        { "name": "session-cache", "type": "Redis", "role": "cache", "poolSize": 20 }
      ],
      "slo": { "latencyP99Ms": 30, "errorRatePct": 0.01 }
    },
    "risk-engine": {
      "description": "Pre-trade risk checks — position limits, exposure, margin",
      "instances": 4,
      "dependsOn": ["market-data-feed"],
      "databases": [
        { "name": "positions-db", "type": "PostgreSQL", "role": "primary", "poolSize": 25 },
        { "name": "limits-cache", "type": "Redis", "role": "cache", "poolSize": 10 }
      ],
      "slo": { "latencyP99Ms": 5, "errorRatePct": 0.001 }
    },
    "trade-reporting": {
      "description": "Post-trade regulatory reporting — MiFID II, EMIR, Dodd-Frank",
      "instances": 2,
      "dependsOn": ["matching-engine"],
      "databases": [
        { "name": "trades-db", "type": "PostgreSQL", "role": "primary", "poolSize": 15 },
        { "name": "trades-db-replica", "type": "PostgreSQL", "role": "replica", "poolSize": 15 }
      ],
      "slo": { "latencyP99Ms": 500, "errorRatePct": 0.001 }
    },
    "settlement-service": {
      "description": "DVP settlement instruction generation and CCP submission",
      "instances": 2,
      "dependsOn": ["trade-reporting", "matching-engine"],
      "databases": [
        { "name": "settlement-db", "type": "PostgreSQL", "role": "primary", "poolSize": 10 }
      ],
      "slo": { "latencyP99Ms": 1000, "errorRatePct": 0.001 }
    },
    "notification-service": {
      "description": "Client order status notifications via WebSocket and FIX drop copy",
      "instances": 3,
      "dependsOn": ["order-gateway", "matching-engine"],
      "databases": [
        { "name": "notification-cache", "type": "Redis", "role": "cache", "poolSize": 15 }
      ],
      "slo": { "latencyP99Ms": 100, "errorRatePct": 0.1 }
    },
    "api-gateway": {
      "description": "Edge layer — TLS termination, rate limiting, routing to internal services",
      "instances": 4,
      "dependsOn": ["order-gateway", "auth-service", "notification-service"],
      "databases": [],
      "slo": { "latencyP99Ms": 20, "errorRatePct": 0.05 }
    }
  },
  "topology": {
    "description": "Directed dependency graph — edges flow from dependent → dependency",
    "edges": [
      { "from": "api-gateway",        "to": "order-gateway" },
      { "from": "api-gateway",        "to": "auth-service" },
      { "from": "api-gateway",        "to": "notification-service" },
      { "from": "order-gateway",      "to": "auth-service" },
      { "from": "order-gateway",      "to": "matching-engine" },
      { "from": "order-gateway",      "to": "market-data-feed" },
      { "from": "order-gateway",      "to": "risk-engine" },
      { "from": "matching-engine",    "to": "market-data-feed" },
      { "from": "matching-engine",    "to": "trade-reporting" },
      { "from": "matching-engine",    "to": "risk-engine" },
      { "from": "market-data-feed",   "to": "price-engine" },
      { "from": "risk-engine",        "to": "market-data-feed" },
      { "from": "trade-reporting",    "to": "settlement-service" },
      { "from": "notification-service","to": "order-gateway" },
      { "from": "notification-service","to": "matching-engine" }
    ]
  }
}
```

---

## 2. Historical Incidents — `incidents.json`

Ten realistic trading-platform incidents. Each has full triage metadata used by the
RAG system in Requirements 01, 02, and 03.

```json
[
  {
    "id": "INC-001",
    "title": "Matching engine orderbook corruption after rolling restart",
    "description": "During a rolling restart of matching-engine instance 3/4, in-flight orders were lost from the in-memory orderbook. Clients received duplicate fill confirmations. Orderbook state diverged from trade-reporting database. Affected approx 340 live orders across US IG credit desk.",
    "affectedServices": ["matching-engine", "trade-reporting", "notification-service"],
    "severity": "CRITICAL",
    "startedAt": "2024-01-08T09:14:00.000Z",
    "resolvedAt": "2024-01-08T09:51:00.000Z",
    "resolvedInMin": 37,
    "rootCause": "Rolling restart did not drain in-flight orders before SIGTERM. Instance 3 accepted a kill signal mid-match, leaving 340 orders in partial state. No leader-election fence was in place to block new orders during the restart window.",
    "resolution": "Immediate: halted new order ingestion via api-gateway circuit breaker. Replayed missed orders from trade-reporting write-ahead log. Long-term: added pre-SIGTERM drain hook with 30-second quiesce period and distributed lock to block inbound orders during restart.",
    "tags": ["restart", "orderbook", "data-loss", "rolling-deploy"]
  },
  {
    "id": "INC-002",
    "title": "PostgreSQL connection pool exhaustion on orders-db during market open",
    "description": "At 08:00 UTC market open, order-gateway connection pool to orders-db hit the 20-connection ceiling across all 6 instances (120 total attempted connections against a server max of 100). New orders queued for up to 8 seconds awaiting a connection slot. Client-visible latency spiked from 12ms to 4200ms P99.",
    "affectedServices": ["order-gateway", "matching-engine"],
    "severity": "HIGH",
    "startedAt": "2024-01-10T08:00:00.000Z",
    "resolvedAt": "2024-01-10T08:22:00.000Z",
    "resolvedInMin": 22,
    "rootCause": "Each of 6 order-gateway instances held a pool of 20 connections (120 total) against a PostgreSQL max_connections of 100. At market open, all pools saturated simultaneously under burst order flow. PgBouncer was in place but misconfigured — pool_mode was set to session instead of transaction, negating connection multiplexing.",
    "resolution": "Switched PgBouncer pool_mode to transaction. Reduced per-instance pool to 8 (48 total). Added connection wait timeout of 500ms to fail fast rather than queue. Added alert on pool utilisation > 80%.",
    "tags": ["database", "connection-pool", "pgbouncer", "market-open", "latency"]
  },
  {
    "id": "INC-003",
    "title": "Auth service Redis session cache eviction causing mass re-authentication",
    "description": "Redis session-cache maxmemory limit was reached during peak load. LRU eviction began removing active sessions, forcing all affected clients to re-authenticate against auth-db. Auth-db connection pool saturated within 60 seconds. 2,300 concurrent sessions were interrupted.",
    "affectedServices": ["auth-service", "api-gateway", "order-gateway"],
    "severity": "HIGH",
    "startedAt": "2024-01-11T14:30:00.000Z",
    "resolvedAt": "2024-01-11T14:58:00.000Z",
    "resolvedInMin": 28,
    "rootCause": "Redis maxmemory was set to 2GB from an old config. Session payload size had grown by 3× after a recent release that added user preferences to the JWT claims. Memory was exhausted earlier than expected. LRU eviction cleared valid sessions.",
    "resolution": "Increased Redis maxmemory to 8GB. Removed non-essential claims from JWT payload (preferences moved to a separate lazy-loaded API). Added Redis memory utilisation alert at 70%.",
    "tags": ["redis", "cache-eviction", "auth", "session", "memory"]
  },
  {
    "id": "INC-004",
    "title": "Market data feed latency spike from upstream provider BGP reroute",
    "description": "Primary feed provider experienced a BGP reroute causing 5–8 second packet loss windows every 90 seconds. market-data-feed latency spiked to 5400ms P99. Staleness threshold on price-engine (1000ms) was breached, causing matching-engine to reject orders with stale price errors. Approximately 12% order rejection rate for 34 minutes.",
    "affectedServices": ["market-data-feed", "price-engine", "matching-engine", "order-gateway"],
    "severity": "HIGH",
    "startedAt": "2024-01-12T11:05:00.000Z",
    "resolvedAt": "2024-01-12T11:39:00.000Z",
    "resolvedInMin": 34,
    "rootCause": "Upstream feed provider BGP reroute introduced periodic packet loss. market-data-feed has a single-provider configuration — no automatic failover to backup feed. Staleness threshold was not widened during the degraded period.",
    "resolution": "Switched to backup feed provider. Implemented automatic feed failover triggered when primary latency exceeds 2000ms for 30 seconds. Added dynamic staleness threshold widening during failover window.",
    "tags": ["feed", "latency", "stale-price", "bgp", "failover", "upstream"]
  },
  {
    "id": "INC-005",
    "title": "Risk engine deadlock during simultaneous position limit updates",
    "description": "Two concurrent regulatory limit recalculation jobs acquired row-level locks in opposite orders across the positions-db table, causing a deadlock. PostgreSQL deadlock detector rolled back one transaction. The rolled-back job retried immediately, causing a retry storm. Risk checks were unavailable for 8 minutes, blocking all new orders.",
    "affectedServices": ["risk-engine", "order-gateway"],
    "severity": "CRITICAL",
    "startedAt": "2024-01-15T10:45:00.000Z",
    "resolvedAt": "2024-01-15T10:53:00.000Z",
    "resolvedInMin": 8,
    "rootCause": "Two limit-recalculation jobs used different lock acquisition orders (Job A: instrument → counterparty; Job B: counterparty → instrument). Under concurrent execution this produced a circular wait. Exponential backoff was missing from the retry logic — immediate retries amplified deadlock frequency.",
    "resolution": "Standardised lock acquisition order across all jobs (always instrument first). Added exponential backoff with jitter to all retry paths. Added deadlock_count metric alert.",
    "tags": ["database", "deadlock", "risk", "retry-storm", "postgresql"]
  },
  {
    "id": "INC-006",
    "title": "Trade reporting replication lag causing stale regulatory submissions",
    "description": "Read replica for trades-db fell 47 minutes behind the primary due to a long-running analytics query holding an exclusive lock on the replica. trade-reporting service was reading from the replica for MiFID II submission queries, causing it to submit stale trade data to the regulator. 1,200 trade reports were delayed beyond the T+1 deadline.",
    "affectedServices": ["trade-reporting", "settlement-service"],
    "severity": "HIGH",
    "startedAt": "2024-01-16T15:20:00.000Z",
    "resolvedAt": "2024-01-16T16:05:00.000Z",
    "resolvedInMin": 45,
    "rootCause": "An ad-hoc analytics query from the data team ran directly against the read replica using a REPEATABLE READ transaction, blocking WAL replay for 47 minutes. trade-reporting was not configured to fall back to primary when replica lag exceeded a threshold.",
    "resolution": "Killed the blocking analytics query. Configured trade-reporting to read from primary when replica lag > 30 seconds. Moved analytics queries to a dedicated read replica isolated from production replicas. Added replica lag alert at 60 seconds.",
    "tags": ["replication-lag", "read-replica", "regulatory", "trade-reporting", "postgresql"]
  },
  {
    "id": "INC-007",
    "title": "JWT signing key rotation caused mass 401 errors across all services",
    "description": "A planned key rotation in auth-service deployed a new signing key but did not include a grace period for in-flight tokens signed with the old key. All services immediately rejected existing client tokens. 100% of active sessions received 401 responses for approximately 4 minutes until clients re-authenticated.",
    "affectedServices": ["auth-service", "api-gateway", "order-gateway", "matching-engine"],
    "severity": "CRITICAL",
    "startedAt": "2024-01-18T18:00:00.000Z",
    "resolvedAt": "2024-01-18T18:04:00.000Z",
    "resolvedInMin": 4,
    "rootCause": "Key rotation script replaced the active signing key immediately without maintaining the previous key in a verification key set (JWKS). Services purged their cached public keys on TTL expiry (1 minute) and fetched the new key, rejecting all old tokens in the interim.",
    "resolution": "Rolled back to previous key. Implemented dual-key rotation: new key added to JWKS alongside old key; old key removed after 10-minute grace period. Added key rotation runbook with mandatory pre-rotation health check.",
    "tags": ["auth", "jwt", "key-rotation", "401", "session"]
  },
  {
    "id": "INC-008",
    "title": "Memory leak in order-gateway causing gradual OOM across instances",
    "description": "order-gateway instances began exhibiting increasing heap usage starting at 09:00 UTC. By 13:40 UTC, instances 2 and 5 of 6 were OOM-killed by Kubernetes. Remaining instances absorbed the load but also showed growing heap. Full service degradation was imminent before the issue was mitigated.",
    "affectedServices": ["order-gateway", "api-gateway"],
    "severity": "HIGH",
    "startedAt": "2024-01-19T09:00:00.000Z",
    "resolvedAt": "2024-01-19T14:15:00.000Z",
    "resolvedInMin": 315,
    "rootCause": "A v2.4.1 release introduced a middleware that accumulated request metadata objects in a module-level Map for debugging purposes. The Map was never flushed. Under production load (~800 req/s), this grew at ~1.2MB/minute per instance. The leak was not caught in load testing because tests ran for < 5 minutes.",
    "resolution": "Rolled back to v2.4.0. Fixed leak by removing the debug Map. Added heap usage alert at 75% of memory limit. Added 30-minute soak period to load testing pipeline.",
    "tags": ["memory-leak", "oom", "heap", "kubernetes", "rollback"]
  },
  {
    "id": "INC-009",
    "title": "Cascading timeout storm from matching-engine GC pause",
    "description": "A 3.8-second stop-the-world GC pause on matching-engine instance 1 caused 1,400 in-flight requests from order-gateway to time out at the 2000ms client timeout. order-gateway's retry logic retried all 1,400 requests against the other 3 instances, tripling their load. Two further instances triggered GC pauses under the extra load. Cascade lasted 9 minutes.",
    "affectedServices": ["matching-engine", "order-gateway", "risk-engine"],
    "severity": "CRITICAL",
    "startedAt": "2024-01-22T13:15:00.000Z",
    "resolvedAt": "2024-01-22T13:24:00.000Z",
    "resolvedInMin": 9,
    "rootCause": "JVM heap was configured at 28GB with G1GC. A large batch of expired order cleanup triggered a full GC. Retry logic in order-gateway had no jitter and no per-instance circuit breaker, causing a coordinated retry storm that overwhelmed healthy instances.",
    "resolution": "Tuned G1GC: reduced region size, added -XX:MaxGCPauseMillis=200. Replaced coordinated retries with per-instance circuit breakers (trips at 50% error rate, 10-second window). Added jitter to all retry delays.",
    "tags": ["gc", "jvm", "cascade", "retry-storm", "circuit-breaker", "timeout"]
  },
  {
    "id": "INC-010",
    "title": "Settlement service duplicate submission due to at-least-once delivery race",
    "description": "settlement-service submitted 47 duplicate settlement instructions to the CCP (DTCC) during a network partition recovery. When the service reconnected after a 90-second partition, its idempotency check queried a read replica that had not yet caught up with the primary, causing it to re-submit instructions it believed were unsent.",
    "affectedServices": ["settlement-service", "trade-reporting"],
    "severity": "HIGH",
    "startedAt": "2024-01-24T16:45:00.000Z",
    "resolvedAt": "2024-01-24T17:30:00.000Z",
    "resolvedInMin": 45,
    "rootCause": "Idempotency check in settlement-service read from a replica with 95-second replication lag. After the network partition, the service re-processed 47 instructions that the primary had already committed but the replica had not yet replicated. The CCP accepted and processed 12 of the 47 duplicates before the error was caught.",
    "resolution": "Changed idempotency check to always read from primary. Added distributed lock per settlement instruction ID using Redis to prevent concurrent submission. Implemented CCP confirmation callback reconciliation job.",
    "tags": ["settlement", "idempotency", "network-partition", "replication-lag", "distributed-systems"]
  },
  {
    "id": "INC-011",
    "title": "API gateway rate limiter Redis cluster split-brain rejecting valid clients",
    "description": "A network partition in the Redis cluster used by api-gateway's rate limiter caused a split-brain: 2 of 3 nodes formed a primary partition, 1 node formed an isolated partition. api-gateway instances connected to the isolated node applied a local rate limit counter that was out of sync, causing 31% of valid client requests to receive 429 responses.",
    "affectedServices": ["api-gateway", "order-gateway"],
    "severity": "HIGH",
    "startedAt": "2024-01-25T10:10:00.000Z",
    "resolvedAt": "2024-01-25T10:35:00.000Z",
    "resolvedInMin": 25,
    "rootCause": "Redis Cluster was operating with min-replicas-to-write = 0, allowing the isolated partition to continue accepting writes. Rate limit counters on the isolated node diverged from the majority partition. Three api-gateway instances were pinned to the isolated node via stale DNS.",
    "resolution": "Set min-replicas-to-write = 1 to reject writes on minority partitions. Implemented Redis client with automatic replica-set failover (not DNS-pinned). Added 429 rate alert that fires when client-error rate > 5%.",
    "tags": ["redis", "split-brain", "rate-limit", "429", "network-partition", "distributed-systems"]
  }
]
```

---

## 3. Sample Log Batches — `logs.json`

Six realistic log batch scenarios. Each batch is an array of log entries representing
a distinct failure pattern on a distributed, high-volume trading platform.

### Scenario naming

| Key | Scenario |
|---|---|
| `feed_latency_cascade` | Stale price cascade from feed degradation |
| `connection_pool_exhaustion` | DB pool saturation at market open |
| `memory_leak_oom` | Gradual heap growth and OOM kills |
| `gc_pause_retry_storm` | GC pause triggering coordinated retry storm |
| `auth_token_mass_expiry` | JWT key rotation causing mass 401s |
| `replication_lag_deadlock` | Read replica lag + deadlock mix |

```json
{
  "feed_latency_cascade": [
    {"timestamp":"2024-01-12T11:04:45.112Z","level":"WARN", "service":"market-data-feed","message":"Feed handler feed-handler-2 latency 1240ms exceeds warning threshold 1000ms","traceId":null,"instance":"market-data-feed-2"},
    {"timestamp":"2024-01-12T11:04:47.334Z","level":"WARN", "service":"market-data-feed","message":"Feed handler feed-handler-1 latency 1890ms exceeds warning threshold 1000ms","traceId":null,"instance":"market-data-feed-1"},
    {"timestamp":"2024-01-12T11:04:49.001Z","level":"ERROR","service":"market-data-feed","message":"Feed handler feed-handler-2 latency 3100ms exceeds critical threshold 2000ms — marking feed degraded","traceId":null,"instance":"market-data-feed-2"},
    {"timestamp":"2024-01-12T11:04:50.220Z","level":"ERROR","service":"price-engine",    "message":"Stale price detected for instrument US38141GXZ52: last update 3.1s ago, staleness threshold 1.0s","traceId":null,"instance":"price-engine-1"},
    {"timestamp":"2024-01-12T11:04:50.445Z","level":"ERROR","service":"price-engine",    "message":"Stale price detected for instrument US38141GXZ53: last update 3.2s ago, staleness threshold 1.0s","traceId":null,"instance":"price-engine-2"},
    {"timestamp":"2024-01-12T11:04:51.003Z","level":"ERROR","service":"matching-engine", "message":"Order ORD-8821 rejected: price reference stale (3100ms > 1000ms threshold) for instrument US38141GXZ52","traceId":"trc-8821","instance":"matching-engine-3"},
    {"timestamp":"2024-01-12T11:04:51.112Z","level":"ERROR","service":"matching-engine", "message":"Order ORD-8822 rejected: price reference stale (3200ms > 1000ms threshold) for instrument US38141GXZ53","traceId":"trc-8822","instance":"matching-engine-1"},
    {"timestamp":"2024-01-12T11:04:51.334Z","level":"ERROR","service":"order-gateway",   "message":"Order ORD-8821 returned REJECTED from matching-engine: STALE_PRICE — notifying client","traceId":"trc-8821","instance":"order-gateway-4"},
    {"timestamp":"2024-01-12T11:04:52.001Z","level":"ERROR","service":"market-data-feed","message":"Feed handler feed-handler-1 latency 5400ms — connection to upstream provider bloomberg-feed-primary lost","traceId":null,"instance":"market-data-feed-1"},
    {"timestamp":"2024-01-12T11:04:52.445Z","level":"FATAL","service":"market-data-feed","message":"All 3 feed-handler instances reporting degraded state — entering failover mode","traceId":null,"instance":"market-data-feed-1"},
    {"timestamp":"2024-01-12T11:04:53.000Z","level":"ERROR","service":"risk-engine",     "message":"Cannot refresh position limits for desk CREDIT-US: market-data-feed price unavailable for 12 instruments","traceId":null,"instance":"risk-engine-2"},
    {"timestamp":"2024-01-12T11:04:53.112Z","level":"WARN", "service":"order-gateway",   "message":"Risk check bypassed for ORD-8830 — risk-engine returned DEGRADED status, applying last-known limits","traceId":"trc-8830","instance":"order-gateway-2"}
  ],

  "connection_pool_exhaustion": [
    {"timestamp":"2024-01-10T07:59:55.001Z","level":"INFO", "service":"order-gateway","message":"Market open pre-warm: initialising connection pool to orders-db — target 20 connections","traceId":null,"instance":"order-gateway-1"},
    {"timestamp":"2024-01-10T08:00:01.334Z","level":"INFO", "service":"order-gateway","message":"Connection pool ready: 20/20 connections established to orders-db (host: orders-db-primary:5432)","traceId":null,"instance":"order-gateway-1"},
    {"timestamp":"2024-01-10T08:00:03.112Z","level":"WARN", "service":"order-gateway","message":"Connection pool utilisation 85% (17/20) on orders-db — order burst in progress","traceId":null,"instance":"order-gateway-3"},
    {"timestamp":"2024-01-10T08:00:04.001Z","level":"WARN", "service":"order-gateway","message":"Connection pool utilisation 85% (17/20) on orders-db — order burst in progress","traceId":null,"instance":"order-gateway-5"},
    {"timestamp":"2024-01-10T08:00:05.220Z","level":"ERROR","service":"order-gateway","message":"Connection pool exhausted on orders-db — all 20 connections in use. Request queued (queue depth: 4)","traceId":"trc-9001","instance":"order-gateway-1"},
    {"timestamp":"2024-01-10T08:00:05.445Z","level":"ERROR","service":"order-gateway","message":"Connection pool exhausted on orders-db — all 20 connections in use. Request queued (queue depth: 9)","traceId":"trc-9002","instance":"order-gateway-2"},
    {"timestamp":"2024-01-10T08:00:05.667Z","level":"ERROR","service":"order-gateway","message":"Connection pool exhausted on orders-db — all 20 connections in use. Request queued (queue depth: 17)","traceId":"trc-9003","instance":"order-gateway-6"},
    {"timestamp":"2024-01-10T08:00:06.001Z","level":"ERROR","service":"order-gateway","message":"PostgreSQL error: FATAL too many connections (server max_connections=100 reached)","traceId":"trc-9004","instance":"order-gateway-4"},
    {"timestamp":"2024-01-10T08:00:06.334Z","level":"ERROR","service":"order-gateway","message":"Order ORD-9001 failed: connection acquisition timeout after 500ms — pool queue full","traceId":"trc-9001","instance":"order-gateway-1"},
    {"timestamp":"2024-01-10T08:00:07.001Z","level":"WARN", "service":"matching-engine","message":"Inbound order rate dropped 78% — order-gateway upstream degraded","traceId":null,"instance":"matching-engine-2"},
    {"timestamp":"2024-01-10T08:00:08.112Z","level":"ERROR","service":"order-gateway","message":"P99 latency for orders-db queries: 4200ms (SLO: 50ms) — pool wait dominating latency","traceId":null,"instance":"order-gateway-3"},
    {"timestamp":"2024-01-10T08:00:09.334Z","level":"FATAL","service":"order-gateway","message":"Circuit breaker OPEN for orders-db on instance order-gateway-4 — rejecting new orders","traceId":null,"instance":"order-gateway-4"}
  ],

  "memory_leak_oom": [
    {"timestamp":"2024-01-19T09:00:00.000Z","level":"INFO", "service":"order-gateway","message":"Startup complete. Heap: 512MB / 4096MB (12%). Instance version: v2.4.1","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-19T10:00:00.000Z","level":"INFO", "service":"order-gateway","message":"Heap usage: 980MB / 4096MB (24%). GC cycles last hour: 14. Avg pause: 8ms","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-19T11:00:00.000Z","level":"WARN", "service":"order-gateway","message":"Heap usage: 1680MB / 4096MB (41%). GC cycles last hour: 31. Avg pause: 22ms — heap growth trend detected","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-19T12:00:00.000Z","level":"WARN", "service":"order-gateway","message":"Heap usage: 2480MB / 4096MB (60%). GC cycles last hour: 58. Avg pause: 41ms — GC pressure increasing","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-19T13:00:00.000Z","level":"ERROR","service":"order-gateway","message":"Heap usage: 3200MB / 4096MB (78%). Full GC triggered. Pause duration: 1240ms. Throughput impact: 31%","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-19T13:40:12.334Z","level":"ERROR","service":"order-gateway","message":"Heap usage: 3890MB / 4096MB (95%). Full GC pause: 3800ms. Requests timing out downstream","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-19T13:41:05.001Z","level":"FATAL","service":"order-gateway","message":"OutOfMemoryError: Java heap space — JVM terminated. Instance order-gateway-2 killed by OOM killer","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-19T13:41:07.112Z","level":"ERROR","service":"api-gateway",   "message":"Upstream order-gateway-2 health check failed — removing from load balancer pool (4 → 3 active)","traceId":null,"instance":"api-gateway-1"},
    {"timestamp":"2024-01-19T13:41:08.334Z","level":"WARN", "service":"order-gateway","message":"Heap usage: 3100MB / 4096MB (76%) and rising — OOM imminent on this instance","traceId":null,"instance":"order-gateway-5"},
    {"timestamp":"2024-01-19T13:42:00.001Z","level":"FATAL","service":"order-gateway","message":"OutOfMemoryError: Java heap space — JVM terminated. Instance order-gateway-5 killed by OOM killer","traceId":null,"instance":"order-gateway-5"},
    {"timestamp":"2024-01-19T13:42:02.112Z","level":"ERROR","service":"api-gateway",   "message":"Upstream order-gateway-5 health check failed — removing from load balancer pool (3 → 2 active)","traceId":null,"instance":"api-gateway-2"},
    {"timestamp":"2024-01-19T13:42:05.334Z","level":"WARN", "service":"api-gateway",   "message":"Only 2 of 6 order-gateway instances healthy — load shedding initiated. Rejecting 60% of new requests","traceId":null,"instance":"api-gateway-1"}
  ],

  "gc_pause_retry_storm": [
    {"timestamp":"2024-01-22T13:15:00.112Z","level":"WARN", "service":"matching-engine","message":"GC pause started on instance matching-engine-1 — all request threads suspended","traceId":null,"instance":"matching-engine-1"},
    {"timestamp":"2024-01-22T13:15:03.889Z","level":"ERROR","service":"matching-engine","message":"GC pause completed after 3777ms on matching-engine-1. 1412 in-flight requests timed out during pause","traceId":null,"instance":"matching-engine-1"},
    {"timestamp":"2024-01-22T13:15:04.001Z","level":"ERROR","service":"order-gateway",  "message":"Timeout waiting for matching-engine response after 2000ms — retrying on next available instance","traceId":"trc-7001","instance":"order-gateway-1"},
    {"timestamp":"2024-01-22T13:15:04.012Z","level":"ERROR","service":"order-gateway",  "message":"Timeout waiting for matching-engine response after 2000ms — retrying on next available instance","traceId":"trc-7002","instance":"order-gateway-3"},
    {"timestamp":"2024-01-22T13:15:04.034Z","level":"ERROR","service":"order-gateway",  "message":"Timeout waiting for matching-engine response after 2000ms — retrying on next available instance","traceId":"trc-7003","instance":"order-gateway-5"},
    {"timestamp":"2024-01-22T13:15:04.112Z","level":"WARN", "service":"matching-engine","message":"Inbound request rate 340% above baseline on matching-engine-2 — suspected retry storm","traceId":null,"instance":"matching-engine-2"},
    {"timestamp":"2024-01-22T13:15:04.334Z","level":"WARN", "service":"matching-engine","message":"Inbound request rate 340% above baseline on matching-engine-3 — suspected retry storm","traceId":null,"instance":"matching-engine-3"},
    {"timestamp":"2024-01-22T13:15:05.001Z","level":"ERROR","service":"matching-engine","message":"GC pause triggered on matching-engine-2 — heap pressure from retry storm (heap: 24GB/28GB)","traceId":null,"instance":"matching-engine-2"},
    {"timestamp":"2024-01-22T13:15:06.445Z","level":"ERROR","service":"matching-engine","message":"GC pause triggered on matching-engine-3 — heap pressure from retry storm (heap: 26GB/28GB)","traceId":null,"instance":"matching-engine-3"},
    {"timestamp":"2024-01-22T13:15:07.001Z","level":"FATAL","service":"matching-engine","message":"3 of 4 matching-engine instances in GC pause simultaneously — service effectively unavailable","traceId":null,"instance":"matching-engine-4"},
    {"timestamp":"2024-01-22T13:15:07.334Z","level":"ERROR","service":"risk-engine",    "message":"Pre-trade risk check timeout: matching-engine unreachable after 2000ms — blocking new orders","traceId":null,"instance":"risk-engine-1"},
    {"timestamp":"2024-01-22T13:15:08.001Z","level":"ERROR","service":"order-gateway",  "message":"Circuit breaker OPEN for matching-engine — 100% error rate in last 10s window. Halting order submission","traceId":null,"instance":"order-gateway-2"}
  ],

  "auth_token_mass_expiry": [
    {"timestamp":"2024-01-18T18:00:00.112Z","level":"INFO", "service":"auth-service","message":"JWT signing key rotation initiated. New key ID: key-2024-01-18-v2. Old key ID: key-2024-01-17-v1 marked inactive","traceId":null,"instance":"auth-service-1"},
    {"timestamp":"2024-01-18T18:00:01.334Z","level":"ERROR","service":"api-gateway", "message":"JWT validation failed for client client-9821: signature verification error — unknown key ID key-2024-01-17-v1","traceId":"trc-api-9821","instance":"api-gateway-2"},
    {"timestamp":"2024-01-18T18:00:01.445Z","level":"ERROR","service":"api-gateway", "message":"JWT validation failed for client client-9822: signature verification error — unknown key ID key-2024-01-17-v1","traceId":"trc-api-9822","instance":"api-gateway-3"},
    {"timestamp":"2024-01-18T18:00:01.556Z","level":"ERROR","service":"api-gateway", "message":"JWT validation failed for client client-9823: signature verification error — unknown key ID key-2024-01-17-v1","traceId":"trc-api-9823","instance":"api-gateway-1"},
    {"timestamp":"2024-01-18T18:00:02.001Z","level":"ERROR","service":"auth-service","message":"Token re-authentication burst: 847 requests/sec against /auth/token endpoint — 12× baseline","traceId":null,"instance":"auth-service-2"},
    {"timestamp":"2024-01-18T18:00:02.334Z","level":"ERROR","service":"auth-service","message":"auth-db connection pool exhausted: 30/30 connections in use. Re-auth requests queuing","traceId":null,"instance":"auth-service-3"},
    {"timestamp":"2024-01-18T18:00:03.001Z","level":"ERROR","service":"auth-service","message":"auth-db connection pool exhausted: 30/30 connections in use. Re-auth requests queuing","traceId":null,"instance":"auth-service-4"},
    {"timestamp":"2024-01-18T18:00:03.334Z","level":"ERROR","service":"order-gateway","message":"Downstream auth-service returning 503 — unable to validate session for incoming orders. Rejecting with 401","traceId":"trc-ord-5501","instance":"order-gateway-3"},
    {"timestamp":"2024-01-18T18:00:04.001Z","level":"FATAL","service":"auth-service", "message":"Auth-service instance auth-service-3 health check failing — connection pool wait > 5000ms. Kubernetes readiness probe failing","traceId":null,"instance":"auth-service-3"},
    {"timestamp":"2024-01-18T18:00:04.334Z","level":"ERROR","service":"api-gateway",  "message":"5xx error rate 94% in last 10s — circuit breaker OPEN for auth-service. All unauthenticated requests rejected","traceId":null,"instance":"api-gateway-1"},
    {"timestamp":"2024-01-18T18:00:05.001Z","level":"ERROR","service":"matching-engine","message":"Cannot validate order ORD-5501 — auth-service unavailable. Order held in pre-auth queue (depth: 312)","traceId":"trc-ord-5501","instance":"matching-engine-2"},
    {"timestamp":"2024-01-18T18:00:06.334Z","level":"WARN", "service":"auth-service", "message":"JWKS endpoint serving new key only — rolling back to include both key-2024-01-18-v2 and key-2024-01-17-v1 in key set","traceId":null,"instance":"auth-service-1"}
  ],

  "replication_lag_deadlock": [
    {"timestamp":"2024-01-24T15:45:00.112Z","level":"INFO", "service":"trade-reporting","message":"MiFID II batch submission starting — reading 3,240 trades from trades-db-replica for T+0 reporting window","traceId":null,"instance":"trade-reporting-1"},
    {"timestamp":"2024-01-24T15:45:02.334Z","level":"WARN", "service":"trade-reporting","message":"Replication lag on trades-db-replica: 42 seconds. Proceeding — lag below 60s alert threshold","traceId":null,"instance":"trade-reporting-1"},
    {"timestamp":"2024-01-24T15:46:10.001Z","level":"ERROR","service":"trade-reporting","message":"Replication lag on trades-db-replica now 188 seconds — WAL replay blocked by long-running query","traceId":null,"instance":"trade-reporting-1"},
    {"timestamp":"2024-01-24T15:46:15.334Z","level":"ERROR","service":"risk-engine",   "message":"Deadlock detected on positions-db — transaction txn-A (instrument lock) vs txn-B (counterparty lock). PostgreSQL rolled back txn-B","traceId":"trc-risk-001","instance":"risk-engine-1"},
    {"timestamp":"2024-01-24T15:46:15.445Z","level":"ERROR","service":"risk-engine",   "message":"Retrying rolled-back transaction txn-B immediately (retry 1/3)","traceId":"trc-risk-001","instance":"risk-engine-2"},
    {"timestamp":"2024-01-24T15:46:15.557Z","level":"ERROR","service":"risk-engine",   "message":"Deadlock detected again on positions-db — txn-B retry collided with txn-A again. Rolling back","traceId":"trc-risk-001","instance":"risk-engine-2"},
    {"timestamp":"2024-01-24T15:46:15.668Z","level":"ERROR","service":"risk-engine",   "message":"Retrying rolled-back transaction txn-B immediately (retry 2/3)","traceId":"trc-risk-001","instance":"risk-engine-3"},
    {"timestamp":"2024-01-24T15:46:16.001Z","level":"ERROR","service":"settlement-service","message":"Idempotency check for settlement STLM-2240 read from replica (lag: 188s) — record not found. Submitting to CCP","traceId":"trc-stlm-2240","instance":"settlement-service-1"},
    {"timestamp":"2024-01-24T15:46:16.334Z","level":"ERROR","service":"settlement-service","message":"Idempotency check for settlement STLM-2241 read from replica (lag: 188s) — record not found. Submitting to CCP","traceId":"trc-stlm-2241","instance":"settlement-service-2"},
    {"timestamp":"2024-01-24T15:46:17.001Z","level":"FATAL","service":"risk-engine",   "message":"Transaction txn-B failed after 3 retries — deadlock not resolved. Position limit check unavailable for desk RATES-EU","traceId":"trc-risk-001","instance":"risk-engine-1"},
    {"timestamp":"2024-01-24T15:46:17.334Z","level":"ERROR","service":"order-gateway", "message":"Risk check timeout for desk RATES-EU: risk-engine returning errors. Blocking new orders for affected desk","traceId":null,"instance":"order-gateway-2"},
    {"timestamp":"2024-01-24T15:46:20.001Z","level":"ERROR","service":"settlement-service","message":"CCP rejected STLM-2240 as duplicate — settlement already exists with this instruction ID. Duplicate submission detected","traceId":"trc-stlm-2240","instance":"settlement-service-1"}
  ]
}
```

---

## 4. Data Loader — `src/data/index.js`

The loader reads JSON files once at startup and exports **factory functions** that
return fresh copies of the data. This prevents accidental mutation of the seed state
across requests.

```js
// src/data/index.js

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load once at module init — JSON.parse is synchronous and fast at this scale
const _incidents     = JSON.parse(readFileSync(join(__dirname, 'incidents.json'),     'utf8'));
const _logs          = JSON.parse(readFileSync(join(__dirname, 'logs.json'),          'utf8'));
const _serviceTopology = JSON.parse(readFileSync(join(__dirname, 'serviceTopology.json'), 'utf8'));

/**
 * Factory functions — always return a shallow copy so callers
 * cannot mutate the module-level seed arrays.
 */

function getHistoricalIncidents() {
  return [..._incidents];
}

function getLogBatch(scenarioName) {
  const batch = _logs[scenarioName];
  if (!batch) throw new Error(`Unknown log scenario: "${scenarioName}". Available: ${Object.keys(_logs).join(', ')}`);
  return [...batch];
}

function getAllLogScenarios() {
  return Object.keys(_logs);
}

function getServiceTopology() {
  return { ..._serviceTopology };
}

function getService(serviceName) {
  const svc = _serviceTopology.services[serviceName];
  if (!svc) throw new Error(`Unknown service: "${serviceName}"`);
  return { ...svc };
}

export {
  getHistoricalIncidents,
  getLogBatch,
  getAllLogScenarios,
  getServiceTopology,
  getService,
};
```

---

## Seed Data Quality Notes

### Distributed system realism
- Every log entry has an `instance` field (e.g., `order-gateway-3`) reflecting that
  multiple instances run in parallel — critical for correlating which node failed first.
- Log timestamps are millisecond-precise and sequential, showing realistic cascade timing
  (a GC pause on instance 1 → retry storm hits instances 2–3 within 1–2 seconds).
- Connection pool logs show per-instance pool state, not aggregate — matching how
  PgBouncer and HikariCP actually report metrics.

### Failure pattern coverage

| Scenario | Pattern type |
|---|---|
| `feed_latency_cascade` | Upstream dependency degradation → multi-service cascade |
| `connection_pool_exhaustion` | Resource exhaustion under burst load at predictable event (market open) |
| `memory_leak_oom` | Slow-burn failure across multiple hours → sudden OOM kill |
| `gc_pause_retry_storm` | Transient pause → retry amplification → cascade |
| `auth_token_mass_expiry` | Configuration change causing instantaneous wide impact |
| `replication_lag_deadlock` | Two independent faults (lag + deadlock) compounding |

### Historical incident coverage

| INC | Category |
|---|---|
| INC-001 | Stateful service — rolling restart data loss |
| INC-002 | Resource exhaustion — DB connection pool |
| INC-003 | Cache exhaustion — Redis session eviction |
| INC-004 | External dependency — upstream feed degradation |
| INC-005 | Database — deadlock + retry storm |
| INC-006 | Replication — read replica lag + regulatory impact |
| INC-007 | Security / config — JWT key rotation |
| INC-008 | Memory leak — gradual OOM across instances |
| INC-009 | GC / JVM — pause cascade |
| INC-010 | Distributed systems — at-least-once delivery + partition |
| INC-011 | Distributed systems — Redis split-brain + rate limiting |

---

## Testing Requirements

| Test | What to assert |
|---|---|
| `getHistoricalIncidents` | Returns array of ≥ 10 items; each has `id`, `rootCause`, `resolution`, `resolvedInMin` |
| `getLogBatch` | Returns correct scenario array; throws on unknown scenario name |
| `getServiceTopology` | Has `services` and `topology` keys; each service has `instances`, `dependsOn`, `databases` |
| `getService` | Returns correct service object; throws on unknown service name |
| Immutability | Mutating the returned array does not affect subsequent calls |
| JSON validity | All four JSON files parse without error on startup |
| Instance field | Every log entry in every batch has an `instance` field |
| Timestamp order | Log entries within each batch are in ascending timestamp order |
