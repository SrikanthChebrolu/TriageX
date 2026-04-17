import type { LogEntry, Alert, Severity } from '../types';

export interface LogScenario {
  id: string;
  name: string;
  description: string;
  logs: LogEntry[];
}

export interface TriageScenario {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  affectedServices: string[];
}

export interface RootCauseScenario {
  id: string;
  name: string;
  title: string;
  description: string;
  severity: Severity;
  affectedServices: string[];
  logs: LogEntry[];
  alerts?: Alert[];
}

export const LOG_SCENARIOS: LogScenario[] = [
  {
    "id": "LOG-001",
    "name": "Market Data Feed Timeout Cascade",
    "description": "Primary feed provider TCP connection drops silently, stale prices propagate through price-engine to order-gateway causing order rejections across all instruments.",
    "logs": [
      {
        "timestamp": "2024-01-15T09:01:00.000Z",
        "level": "WARN",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-8821",
        "message": "Upstream provider heartbeat timeout after 10s — initiating reconnect"
      },
      {
        "timestamp": "2024-01-15T09:01:05.000Z",
        "level": "ERROR",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-8821",
        "message": "Feed provider TCP connection lost after 3 retries — marking provider UNAVAILABLE"
      },
      {
        "timestamp": "2024-01-15T09:01:08.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "Price staleness threshold exceeded for AAPL — last update 13s ago (limit: 10s)"
      },
      {
        "timestamp": "2024-01-15T09:01:12.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "Price staleness detected on 87 instruments — suspending dissemination"
      },
      {
        "timestamp": "2024-01-15T09:01:15.000Z",
        "level": "ERROR",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "Stale price threshold exceeded on 142 instruments — halting all price dissemination"
      },
      {
        "timestamp": "2024-01-15T09:01:18.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-8821",
        "message": "Order rejected: stale price on AAPL — price age 19s exceeds maximum 10s"
      },
      {
        "timestamp": "2024-01-15T09:01:19.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-8821",
        "message": "Order rejected: stale price on TSLA — price age 20s exceeds maximum 10s"
      },
      {
        "timestamp": "2024-01-15T09:01:22.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-8821",
        "message": "Order rejection rate: 98% — no valid prices available for 139 instruments"
      },
      {
        "timestamp": "2024-01-15T09:01:40.000Z",
        "level": "INFO",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-8821",
        "message": "Reconnection to feed provider successful — resuming price updates"
      },
      {
        "timestamp": "2024-01-15T09:01:55.000Z",
        "level": "INFO",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "All instruments refreshed — resuming normal price dissemination"
      }
    ]
  },
  {
    "id": "LOG-002",
    "name": "Auth Service JWT Key Rotation Failure",
    "description": "JWT signing key rotated without coordinating downstream consumers; all service-to-service calls receive 401 Unauthorized for 22 minutes until new public key is distributed.",
    "logs": [
      {
        "timestamp": "2024-01-16T11:00:00.000Z",
        "level": "INFO",
        "service": "auth-service",
        "instance": "auth-01",
        "traceId": "trc-9001",
        "message": "JWT signing key rotation initiated — new key ID: k-2024-jan-16, old key ID: k-2024-jan-01"
      },
      {
        "timestamp": "2024-01-16T11:00:02.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-9001",
        "message": "Token validation failed: signature verification error — key ID mismatch (expected k-2024-jan-01)"
      },
      {
        "timestamp": "2024-01-16T11:00:02.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-9001",
        "message": "Service token refresh rejected: 401 Unauthorized from auth-service — cached public key invalid"
      },
      {
        "timestamp": "2024-01-16T11:00:03.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-9001",
        "message": "Inbound request rejected: 401 Unauthorized — JWT signature verification failed"
      },
      {
        "timestamp": "2024-01-16T11:00:04.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-9001",
        "message": "401 error rate: 89% across all downstream services in last 10s — possible auth outage"
      },
      {
        "timestamp": "2024-01-16T11:00:06.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-9001",
        "message": "Authorization failed on inter-service call to trade-executor: 401 — halting settlement processing"
      },
      {
        "timestamp": "2024-01-16T11:00:08.000Z",
        "level": "WARN",
        "service": "auth-service",
        "instance": "auth-01",
        "traceId": "trc-9001",
        "message": "High volume of token validation failures detected — 2,340 failures in 8s"
      },
      {
        "timestamp": "2024-01-16T11:22:00.000Z",
        "level": "INFO",
        "service": "auth-service",
        "instance": "auth-01",
        "traceId": "trc-9001",
        "message": "New JWKS public key pushed to all registered consumers — key rotation complete"
      },
      {
        "timestamp": "2024-01-16T11:22:15.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-9001",
        "message": "Token re-validated successfully with new key ID k-2024-jan-16 — resuming operations"
      }
    ]
  },
  {
    "id": "LOG-003",
    "name": "Database Connection Pool Exhaustion",
    "description": "A slow SQL query introduced in the 14:00 deploy holds DB connections, saturating the connection pool and causing trade-executor latency to breach SLA.",
    "logs": [
      {
        "timestamp": "2024-01-20T14:05:00.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-pool-2240",
        "message": "Slow query detected: SELECT * FROM trades WHERE trade_date > ? ORDER BY instrument_id — execution time 4200ms"
      },
      {
        "timestamp": "2024-01-20T14:05:08.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-02",
        "traceId": "trc-pool-2240",
        "message": "DB connection pool: 43/50 connections in use — approaching saturation"
      },
      {
        "timestamp": "2024-01-20T14:05:18.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-pool-2240",
        "message": "DB connection pool exhausted: 50/50 connections in use — new requests queuing"
      },
      {
        "timestamp": "2024-01-20T14:05:22.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-pool-2240",
        "message": "Connection acquire timeout after 5000ms — pool queue depth: 87 waiting requests"
      },
      {
        "timestamp": "2024-01-20T14:05:25.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-pool-2240",
        "message": "trade-executor p99 latency: 8200ms — SLA threshold is 500ms"
      },
      {
        "timestamp": "2024-01-20T14:05:28.000Z",
        "level": "ERROR",
        "service": "postgres-primary",
        "instance": "pg-01",
        "traceId": "trc-pool-2240",
        "message": "Max connections reached: 100/100 — new connection refused (ERROR 1040)"
      },
      {
        "timestamp": "2024-01-20T14:05:32.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-pool-2240",
        "message": "Settlement batch delayed — waiting for trade-executor to recover (delay: 4min)"
      },
      {
        "timestamp": "2024-01-20T14:40:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-pool-2240",
        "message": "Index added on (trade_date, instrument_id) — query execution time reduced to 12ms"
      }
    ]
  },
  {
    "id": "LOG-004",
    "name": "Database Deadlock Cascade",
    "description": "Two concurrent settlement batch jobs acquire row locks in opposite order, causing a deadlock cycle that backs up the settlement queue to thousands of pending items.",
    "logs": [
      {
        "timestamp": "2024-02-05T16:00:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Settlement batch job A started — processing instruments: AAPL, MSFT, GOOGL (87 records)"
      },
      {
        "timestamp": "2024-02-05T16:00:01.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-deadlock-441",
        "message": "Settlement batch job B started — processing instruments: GOOGL, MSFT, AAPL (92 records)"
      },
      {
        "timestamp": "2024-02-05T16:00:04.000Z",
        "level": "WARN",
        "service": "postgres-primary",
        "instance": "pg-01",
        "traceId": "trc-deadlock-440",
        "message": "Deadlock detected: transaction 440 waiting on lock held by transaction 441 — circular wait"
      },
      {
        "timestamp": "2024-02-05T16:00:04.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Deadlock exception on settlement write: ERROR 1213 — transaction rolled back, retrying in 500ms"
      },
      {
        "timestamp": "2024-02-05T16:00:05.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-deadlock-441",
        "message": "Deadlock exception on settlement write: ERROR 1213 — transaction rolled back, retrying in 500ms"
      },
      {
        "timestamp": "2024-02-05T16:00:10.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Deadlock retry 3/3 failed — batch job A aborting; 87 records unprocessed"
      },
      {
        "timestamp": "2024-02-05T16:00:12.000Z",
        "level": "WARN",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-deadlock-440",
        "message": "Settlement queue depth: 2,412 pending records — processing halted"
      },
      {
        "timestamp": "2024-02-05T16:25:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Deterministic lock ordering applied (sorted by instrument_id) — deadlock resolved, reprocessing batch"
      }
    ]
  },
  {
    "id": "LOG-005",
    "name": "Memory Heap Exhaustion OOM Kill",
    "description": "Risk engine position cache grows unbounded over the trading session due to a TTL eviction bug; heap exhaustion triggers OOM kill and Kubernetes pod restart.",
    "logs": [
      {
        "timestamp": "2024-01-17T08:00:00.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 42% (840 MB / 2 GB) — GC activity nominal"
      },
      {
        "timestamp": "2024-01-17T09:00:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 68% (1360 MB / 2 GB) — minor GC pause 220ms, position cache entries: 148,000"
      },
      {
        "timestamp": "2024-01-17T10:00:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 81% (1620 MB / 2 GB) — GC pause 540ms, position cache entries: 312,000"
      },
      {
        "timestamp": "2024-01-17T10:12:00.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 97% (1940 MB / 2 GB) — full GC pause 2100ms, application threads stopped"
      },
      {
        "timestamp": "2024-01-17T10:15:00.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "FATAL: java.lang.OutOfMemoryError: Java heap space — process killed by OOM killer"
      },
      {
        "timestamp": "2024-01-17T10:15:05.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-02",
        "traceId": "trc-oom-5501",
        "message": "risk-engine unreachable — connection refused on port 8082, marking as DOWN"
      },
      {
        "timestamp": "2024-01-17T10:15:08.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-oom-5501",
        "message": "Pre-trade risk check failed: risk-engine unavailable — orders held pending recovery"
      },
      {
        "timestamp": "2024-01-17T10:15:30.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Pod restarted by Kubernetes — waiting for readiness probe (timeout: 60s)"
      },
      {
        "timestamp": "2024-01-17T10:16:15.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Readiness probe passed — resuming risk calculations with clean position cache"
      }
    ]
  },
  {
    "id": "LOG-006",
    "name": "GC Pause Storm Causing Timeouts",
    "description": "Price engine experiences severe GC pause storms at market open due to excessive object allocation in the hot path, causing downstream stale-price alerts and order rejections.",
    "logs": [
      {
        "timestamp": "2024-03-15T09:30:00.000Z",
        "level": "INFO",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "Market open: processing 48,000 price updates/sec — heap at 55%"
      },
      {
        "timestamp": "2024-03-15T09:30:05.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "GC pause 820ms — young generation exhausted, allocation rate: 4.2 GB/s"
      },
      {
        "timestamp": "2024-03-15T09:30:12.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "GC pause 1350ms — full GC triggered, throughput dropped to 12,000 updates/sec"
      },
      {
        "timestamp": "2024-03-15T09:30:15.000Z",
        "level": "ERROR",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "GC pause 2100ms — application threads stopped, price dissemination suspended for 2.1s"
      },
      {
        "timestamp": "2024-03-15T09:30:17.000Z",
        "level": "WARN",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-gc-7721",
        "message": "price-engine not consuming — feed buffer growing: 14,200 queued messages"
      },
      {
        "timestamp": "2024-03-15T09:30:18.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-gc-7721",
        "message": "Stale price detected on MSFT — last update 3.8s ago (limit 1s) — order rejected"
      },
      {
        "timestamp": "2024-03-15T09:30:20.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-gc-7721",
        "message": "Order rejection rate: 71% — GC pauses causing systemic stale price condition"
      },
      {
        "timestamp": "2024-03-15T10:15:00.000Z",
        "level": "INFO",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "Object pooling enabled in price normalisation hot path — GC pause reduced to 48ms"
      }
    ]
  },
  {
    "id": "LOG-007",
    "name": "Kafka Consumer Group Rebalance Storm",
    "description": "Rolling restart of order-event consumers triggers repeated rebalancing; no consumers are assigned partitions during rebalance cycles, causing 9,000 events to accumulate.",
    "logs": [
      {
        "timestamp": "2024-02-20T13:00:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-rebal-3310",
        "message": "Rolling restart initiated for order-event-consumer group (3 pods)"
      },
      {
        "timestamp": "2024-02-20T13:00:05.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance triggered — member te-01 left group"
      },
      {
        "timestamp": "2024-02-20T13:00:08.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance #1 complete — 12 partitions assigned to 2 members"
      },
      {
        "timestamp": "2024-02-20T13:00:15.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance #2 triggered — member te-02 session timeout (10s)"
      },
      {
        "timestamp": "2024-02-20T13:00:22.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-02",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance #5 — all members left, no partitions assigned"
      },
      {
        "timestamp": "2024-02-20T13:00:25.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rebal-3310",
        "message": "order-event-consumer lag: 4,200 messages — consumer group in rebalance, no processing"
      },
      {
        "timestamp": "2024-02-20T13:08:00.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rebal-3310",
        "message": "order-event-consumer lag: 9,100 messages — 8 minutes without processing"
      },
      {
        "timestamp": "2024-02-20T13:08:30.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: stable — 12 partitions assigned to 3 members"
      },
      {
        "timestamp": "2024-02-20T13:12:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer lag cleared — 9,100 events processed, all partitions caught up"
      }
    ]
  },
  {
    "id": "LOG-008",
    "name": "Kafka DLQ Overflow Poison Pill Messages",
    "description": "Schema change in trade confirmation messages causes deserialization failures; 240 messages are routed to the dead-letter queue after exhausting retries. DLQ consumer is not running.",
    "logs": [
      {
        "timestamp": "2024-03-10T10:00:00.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Deserialization error on trade-confirmations topic partition 3 offset 44201: unknown field 'settlementCurrency'"
      },
      {
        "timestamp": "2024-03-10T10:00:02.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Retrying message (attempt 1/3) — offset 44201, topic: trade-confirmations"
      },
      {
        "timestamp": "2024-03-10T10:00:06.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Retrying message (attempt 2/3) — offset 44201, same deserialization error persists"
      },
      {
        "timestamp": "2024-03-10T10:00:10.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Message retry exhausted (3/3) — routing to DLQ: trade-confirmations.dlq, offset 44201"
      },
      {
        "timestamp": "2024-03-10T10:00:12.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-02",
        "traceId": "trc-dlq-8801",
        "message": "DLQ topic trade-confirmations.dlq: 48 messages, consumer group dlq-consumer has 0 active members"
      },
      {
        "timestamp": "2024-03-10T10:30:00.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-02",
        "traceId": "trc-dlq-8801",
        "message": "DLQ topic trade-confirmations.dlq: 240 messages — approaching retention limit (500 messages)"
      },
      {
        "timestamp": "2024-03-10T10:30:05.000Z",
        "level": "ERROR",
        "service": "notification-service",
        "instance": "ns-01",
        "traceId": "trc-dlq-8801",
        "message": "240 trade confirmations not delivered — clients may not receive settlement notifications"
      },
      {
        "timestamp": "2024-03-10T11:15:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-dlq-8801",
        "message": "Schema-compatible consumer deployed — replaying DLQ: 240 messages, estimated 4 min"
      },
      {
        "timestamp": "2024-03-10T11:19:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-dlq-8801",
        "message": "DLQ replay complete — 240 messages processed successfully"
      }
    ]
  },
  {
    "id": "LOG-009",
    "name": "Out-of-Order Kafka Event Processing",
    "description": "Partition reassignment causes two consumers to briefly process the same partition, producing out-of-order and duplicate position updates leading to incorrect account positions.",
    "logs": [
      {
        "timestamp": "2024-04-08T14:00:00.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-ooo-6610",
        "message": "Partition reassignment initiated for topic trade-events — moving partition 7 from broker-2 to broker-3"
      },
      {
        "timestamp": "2024-04-08T14:00:03.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Duplicate message detected: trade-event seq=88441 already processed — reprocessing due to partition reassignment"
      },
      {
        "timestamp": "2024-04-08T14:00:04.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-02",
        "traceId": "trc-ooo-6610",
        "message": "Out-of-order event: trade seq=88443 received before seq=88442 — position calculation may be incorrect"
      },
      {
        "timestamp": "2024-04-08T14:00:06.000Z",
        "level": "ERROR",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Position inconsistency detected for account ACC-7841: expected net=+1500 AAPL, calculated net=+3000 AAPL"
      },
      {
        "timestamp": "2024-04-08T14:00:08.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-ooo-6610",
        "message": "VaR calculation using stale/incorrect position data for 3 accounts — results unreliable"
      },
      {
        "timestamp": "2024-04-08T14:00:10.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Idempotency check failure on 23 position updates — duplicate processing window: 4 minutes"
      },
      {
        "timestamp": "2024-04-08T14:12:00.000Z",
        "level": "INFO",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Transactional outbox pattern activated — sequence validation enabled, idempotency keys enforced"
      },
      {
        "timestamp": "2024-04-08T14:15:00.000Z",
        "level": "INFO",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Position reconciliation complete — 23 affected accounts corrected"
      }
    ]
  },
  {
    "id": "LOG-010",
    "name": "Kafka Broker Leader Election During Disk Exhaustion",
    "description": "High-throughput Kafka broker fills disk due to missing log retention config; broker leaves ISR and triggers mass leader elections causing producer unavailability.",
    "logs": [
      {
        "timestamp": "2024-05-02T08:00:00.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Broker disk usage: 75% (750 GB / 1 TB) on /var/kafka/logs — monitor closely"
      },
      {
        "timestamp": "2024-05-02T11:30:00.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Broker disk usage: 92% (920 GB / 1 TB) — market-event topic has no retention.bytes configured"
      },
      {
        "timestamp": "2024-05-02T13:45:00.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Disk full: 100% utilisation — broker shutting down log flushing, leaving ISR for all partitions"
      },
      {
        "timestamp": "2024-05-02T13:45:05.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-leader-9901",
        "message": "ISR shrink detected for 48 partitions — initiating leader elections"
      },
      {
        "timestamp": "2024-05-02T13:45:08.000Z",
        "level": "ERROR",
        "service": "zookeeper",
        "instance": "zk-01",
        "traceId": "trc-leader-9901",
        "message": "48 concurrent leader elections in progress — ZooKeeper under heavy write load"
      },
      {
        "timestamp": "2024-05-02T13:45:10.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-leader-9901",
        "message": "Kafka producer: LEADER_NOT_AVAILABLE on market-event topic — order events cannot be published"
      },
      {
        "timestamp": "2024-05-02T13:45:12.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-leader-9901",
        "message": "Kafka producer error: NotLeaderForPartitionException — retrying with backoff"
      },
      {
        "timestamp": "2024-05-02T14:17:00.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Disk cleared (200 GB freed) — broker rejoining cluster, log retention.bytes=50GB applied"
      },
      {
        "timestamp": "2024-05-02T14:20:00.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-leader-9901",
        "message": "All 48 partitions have elected stable leaders — producer availability restored"
      }
    ]
  },
  {
    "id": "LOG-011",
    "name": "Network Partition Between AZs",
    "description": "AWS network ACL misconfiguration blocks cross-AZ TCP traffic for 8 minutes, causing widespread connection timeouts between services in different availability zones.",
    "logs": [
      {
        "timestamp": "2024-06-10T15:00:00.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-02",
        "traceId": "trc-npart-1100",
        "message": "Health check failing for trade-executor in us-east-1b — connection timeout after 5s"
      },
      {
        "timestamp": "2024-06-10T15:00:02.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-npart-1100",
        "message": "Cannot reach postgres-primary in us-east-1a — TCP connect timeout after 10s"
      },
      {
        "timestamp": "2024-06-10T15:00:03.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-02",
        "traceId": "trc-npart-1100",
        "message": "position-service unreachable (us-east-1a) — gRPC connection reset, error: UNAVAILABLE"
      },
      {
        "timestamp": "2024-06-10T15:00:05.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-npart-1100",
        "message": "Cross-AZ call to matching-engine failed — connection refused, circuit breaker opening"
      },
      {
        "timestamp": "2024-06-10T15:00:06.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-npart-1100",
        "message": "clearing-service (us-east-1a) unreachable — all settlement operations halted"
      },
      {
        "timestamp": "2024-06-10T15:00:08.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-npart-1100",
        "message": "AZ partition suspected — 100% cross-AZ call failure, routing to single-AZ failover"
      },
      {
        "timestamp": "2024-06-10T15:08:00.000Z",
        "level": "INFO",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-npart-1100",
        "message": "AWS ACL rule reverted — cross-AZ connectivity restored"
      },
      {
        "timestamp": "2024-06-10T15:08:15.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-npart-1100",
        "message": "postgres-primary connection re-established — resuming normal operations"
      }
    ]
  },
  {
    "id": "LOG-012",
    "name": "Circuit Breaker Open Cascade",
    "description": "Settlement service latency spikes after DB replica failover; circuit breakers in trade-executor and clearing-service trip, blocking all settlement operations for 7 minutes.",
    "logs": [
      {
        "timestamp": "2024-01-18T14:00:00.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-cb-7001",
        "message": "DB replica failover detected — switching to standby replica, latency elevated"
      },
      {
        "timestamp": "2024-01-18T14:00:05.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-cb-7001",
        "message": "Latency spike: p99=4800ms (threshold 500ms) — serving degraded"
      },
      {
        "timestamp": "2024-01-18T14:00:10.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cb-7001",
        "message": "settlement-service call timeout after 2000ms — circuit breaker failure count: 3/5"
      },
      {
        "timestamp": "2024-01-18T14:00:15.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cb-7001",
        "message": "Circuit breaker OPEN on settlement-service — all settlement calls will be rejected for 30s"
      },
      {
        "timestamp": "2024-01-18T14:00:17.000Z",
        "level": "ERROR",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-cb-7001",
        "message": "settlement-service circuit breaker OPEN — clearing operations suspended"
      },
      {
        "timestamp": "2024-01-18T14:00:18.000Z",
        "level": "WARN",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-cb-7001",
        "message": "Post-trade flow degraded — settlement confirmation unavailable, trades queuing"
      },
      {
        "timestamp": "2024-01-18T14:07:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-cb-7001",
        "message": "DB failover complete — standby fully promoted, latency normalised to p99=45ms"
      },
      {
        "timestamp": "2024-01-18T14:07:30.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cb-7001",
        "message": "Circuit breaker HALF-OPEN — probe request succeeded, transitioning to CLOSED"
      }
    ]
  },
  {
    "id": "LOG-013",
    "name": "Rate Limiter Triggering Under Load Spike",
    "description": "Algorithmic client submits orders far above their TPS quota; rate limiter triggers correctly but the client's aggressive retry amplifies connection load, overwhelming the order-gateway connection pool.",
    "logs": [
      {
        "timestamp": "2024-07-22T09:30:00.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "Order submission rate from client ALGO-412: 4,200 TPS (quota: 1,000 TPS)"
      },
      {
        "timestamp": "2024-07-22T09:30:01.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-rl-5540",
        "message": "Rate limit threshold exceeded for ALGO-412 — issuing 429 Too Many Requests"
      },
      {
        "timestamp": "2024-07-22T09:30:01.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "ALGO-412 retry storm: 12,400 connection attempts in 1s following 429 response (no backoff)"
      },
      {
        "timestamp": "2024-07-22T09:30:02.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "Connection pool exhausted: 500/500 — legitimate clients receiving connection refused"
      },
      {
        "timestamp": "2024-07-22T09:30:03.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-rl-5540",
        "message": "Connection pool exhausted: 500/500 — spillover to og-02 also exhausted"
      },
      {
        "timestamp": "2024-07-22T09:30:04.000Z",
        "level": "WARN",
        "service": "matching-engine",
        "instance": "me-01",
        "traceId": "trc-rl-5540",
        "message": "Order submission from order-gateway ceased — no new orders in last 3s"
      },
      {
        "timestamp": "2024-07-22T09:38:00.000Z",
        "level": "INFO",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-rl-5540",
        "message": "ALGO-412 IP blocked pending remediation — rate limiter connection amplification protection enabled"
      },
      {
        "timestamp": "2024-07-22T09:38:30.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "Connection pool recovering — legitimate client traffic normalising"
      }
    ]
  },
  {
    "id": "LOG-014",
    "name": "Risk Limit Breach Rejection Storm",
    "description": "Algo trading desk exceeds its intraday position limit; risk-engine begins rejecting all orders from the desk, triggering 1,200 rejections in 4 minutes.",
    "logs": [
      {
        "timestamp": "2024-08-14T11:00:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "Desk DESK-USO position limit approaching: 87% utilised (87,000 / 100,000 contracts)"
      },
      {
        "timestamp": "2024-08-14T11:01:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "Desk DESK-USO position limit: 97% utilised — issuing pre-breach warning to compliance-engine"
      },
      {
        "timestamp": "2024-08-14T11:02:00.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "RISK LIMIT BREACH: DESK-USO net position 101,400 contracts exceeds limit 100,000 — rejecting all new orders"
      },
      {
        "timestamp": "2024-08-14T11:02:01.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-risk-6620",
        "message": "Order DESK-USO rejected by risk-engine: position limit exceeded — rejection count: 1"
      },
      {
        "timestamp": "2024-08-14T11:02:30.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-risk-6620",
        "message": "Order rejection count for DESK-USO: 340 in 30 seconds — desk still submitting orders"
      },
      {
        "timestamp": "2024-08-14T11:04:00.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-risk-6620",
        "message": "Total order rejections for DESK-USO: 1,200 — desk operations team notified"
      },
      {
        "timestamp": "2024-08-14T11:04:05.000Z",
        "level": "WARN",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-risk-6620",
        "message": "Limit breach event logged to audit trail — regulatory notification prepared"
      },
      {
        "timestamp": "2024-08-14T11:22:00.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "DESK-USO limit updated to 140,000 contracts — new orders accepted, position: 101,400"
      }
    ]
  },
  {
    "id": "LOG-015",
    "name": "FIX Protocol Session Drop",
    "description": "fix-gateway TCP keepalive not enabled; a co-location network device silently drops idle FIX session, withdrawing market maker quotes and widening spreads for 18 minutes.",
    "logs": [
      {
        "timestamp": "2024-09-03T10:00:00.000Z",
        "level": "INFO",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX session established with MM-BARCLAYS: SenderCompID=TRIAGEX, TargetCompID=BARCFX, SeqNum=1"
      },
      {
        "timestamp": "2024-09-03T10:01:00.000Z",
        "level": "WARN",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX heartbeat timeout: no Heartbeat(0) received from MM-BARCLAYS in 30s — sending TestRequest"
      },
      {
        "timestamp": "2024-09-03T10:01:10.000Z",
        "level": "WARN",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "No response to TestRequest after 10s — FIX session considered DROPPED for MM-BARCLAYS"
      },
      {
        "timestamp": "2024-09-03T10:01:12.000Z",
        "level": "ERROR",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX session disconnected: TCP connection reset by network device — idle timeout detected"
      },
      {
        "timestamp": "2024-09-03T10:01:14.000Z",
        "level": "ERROR",
        "service": "matching-engine",
        "instance": "me-01",
        "traceId": "trc-fix-4410",
        "message": "MM-BARCLAYS quotes withdrawn from order book — spread widening on EUR/USD, GBP/USD, USD/JPY"
      },
      {
        "timestamp": "2024-09-03T10:01:15.000Z",
        "level": "WARN",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-fix-4410",
        "message": "No best bid/offer for EUR/USD — client orders resting at limit, no execution"
      },
      {
        "timestamp": "2024-09-03T10:18:30.000Z",
        "level": "INFO",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX session re-established with MM-BARCLAYS — TCP keepalive enabled (30s interval)"
      },
      {
        "timestamp": "2024-09-03T10:18:45.000Z",
        "level": "INFO",
        "service": "matching-engine",
        "instance": "me-01",
        "traceId": "trc-fix-4410",
        "message": "MM-BARCLAYS quotes restored — normal spread resumed on all FX pairs"
      }
    ]
  },
  {
    "id": "LOG-016",
    "name": "Margin Call Processing Failure",
    "description": "End-of-day margin call processing times out; a new stress scenario added to the prior release increases computation time beyond the SLA, leaving 847 accounts without margin calls.",
    "logs": [
      {
        "timestamp": "2024-10-15T17:00:00.000Z",
        "level": "INFO",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "End-of-day margin call batch started — 847 accounts, 12 stress scenarios each"
      },
      {
        "timestamp": "2024-10-15T18:00:00.000Z",
        "level": "INFO",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Margin batch progress: 182/847 accounts (21%) — elapsed: 60 min, estimated remaining: 240 min"
      },
      {
        "timestamp": "2024-10-15T19:00:00.000Z",
        "level": "WARN",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Margin batch progress: 310/847 accounts (37%) — exceeding 3-hour SLA projected"
      },
      {
        "timestamp": "2024-10-15T20:00:00.000Z",
        "level": "ERROR",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Margin call batch TIMEOUT after 3 hours — 537/847 accounts processed, 310 accounts incomplete"
      },
      {
        "timestamp": "2024-10-15T20:00:02.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-margin-3301",
        "message": "Margin batch did not complete — 310 accounts have no margin call for today's session"
      },
      {
        "timestamp": "2024-10-15T20:00:05.000Z",
        "level": "WARN",
        "service": "notification-service",
        "instance": "ns-01",
        "traceId": "trc-margin-3301",
        "message": "310 margin call notifications suppressed — batch incomplete flag set"
      },
      {
        "timestamp": "2024-10-15T20:10:00.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-margin-3301",
        "message": "Risk team escalated: 310 accounts require manual margin call generation"
      },
      {
        "timestamp": "2024-10-16T09:00:00.000Z",
        "level": "INFO",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Parallelised scenario generation deployed — 847 accounts processed in 87 minutes"
      }
    ]
  },
  {
    "id": "LOG-017",
    "name": "Compliance Rule Engine Timeout",
    "description": "Sanctions list database update adds 4,200 entries without indexing, causing pre-trade compliance checks to time out and delay orders beyond SLA.",
    "logs": [
      {
        "timestamp": "2024-11-05T08:00:00.000Z",
        "level": "INFO",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Sanctions list updated: 4,200 new entries added — total: 89,421 entries"
      },
      {
        "timestamp": "2024-11-05T08:01:00.000Z",
        "level": "WARN",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Pre-trade check latency elevated: p50=180ms, p99=620ms (limit: 200ms) — possible index issue"
      },
      {
        "timestamp": "2024-11-05T08:05:00.000Z",
        "level": "ERROR",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Pre-trade sanctions check timeout: 520ms for counterparty BARC-UK-4421 — timeout limit 200ms"
      },
      {
        "timestamp": "2024-11-05T08:05:02.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-comply-7730",
        "message": "Order delayed: compliance pre-trade check exceeded 200ms SLA — 3,400 orders pending"
      },
      {
        "timestamp": "2024-11-05T08:05:05.000Z",
        "level": "ERROR",
        "service": "compliance-engine",
        "instance": "ce-02",
        "traceId": "trc-comply-7730",
        "message": "Fallback policy triggered: 2 orders auto-rejected due to timeout — audit record created"
      },
      {
        "timestamp": "2024-11-05T08:05:08.000Z",
        "level": "WARN",
        "service": "audit-service",
        "instance": "as-01",
        "traceId": "trc-comply-7730",
        "message": "Compliance timeout event logged — regulatory reporting required for auto-rejected orders"
      },
      {
        "timestamp": "2024-11-05T09:20:00.000Z",
        "level": "INFO",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Trigram index created on sanctions_list(counterparty_name) — check latency: 12ms"
      },
      {
        "timestamp": "2024-11-05T09:21:00.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-comply-7730",
        "message": "Pre-trade compliance checks restored to normal latency — 3,400 queued orders processing"
      }
    ]
  },
  {
    "id": "LOG-018",
    "name": "Bad Config Push Causing Startup Failures",
    "description": "Config-service YAML merge produces null values for critical environment variables; dependent services fail to start or lose connectivity to their dependencies.",
    "logs": [
      {
        "timestamp": "2024-12-02T10:00:00.000Z",
        "level": "INFO",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Config deployment started — version: v2.4.1, target: production, services: 12"
      },
      {
        "timestamp": "2024-12-02T10:00:05.000Z",
        "level": "WARN",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Config push complete — YAML merge applied for 12 services"
      },
      {
        "timestamp": "2024-12-02T10:00:10.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-cfg-2210",
        "message": "Startup failed: KAFKA_BROKER_URL is null — cannot establish producer connection"
      },
      {
        "timestamp": "2024-12-02T10:00:11.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-cfg-2210",
        "message": "Startup failed: POSTGRES_HOST is null — database connection string invalid"
      },
      {
        "timestamp": "2024-12-02T10:00:12.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cfg-2210",
        "message": "Startup failed: REDIS_SENTINEL_URL is null — session store connection failed"
      },
      {
        "timestamp": "2024-12-02T10:00:13.000Z",
        "level": "ERROR",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-cfg-2210",
        "message": "Downstream service health checks failing: order-gateway, risk-engine, trade-executor — returning 503"
      },
      {
        "timestamp": "2024-12-02T10:00:15.000Z",
        "level": "WARN",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Rollback initiated — reverting to config version v2.4.0"
      },
      {
        "timestamp": "2024-12-02T10:00:30.000Z",
        "level": "INFO",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Config rollback complete — v2.4.0 deployed to all services"
      },
      {
        "timestamp": "2024-12-02T10:00:45.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-cfg-2210",
        "message": "Service started successfully with v2.4.0 config — all connections established"
      }
    ]
  },
  {
    "id": "LOG-019",
    "name": "Rolling Deployment Causing Version Mismatch",
    "description": "Breaking API change in trade-executor v1.9 runs alongside v1.8 pods during rollout; old-version pods fail to process v1.9 payloads for 12 minutes until deployment is paused.",
    "logs": [
      {
        "timestamp": "2024-09-18T14:00:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Rolling deployment started: trade-executor v1.8 -> v1.9 (3 pods, 1 at a time)"
      },
      {
        "timestamp": "2024-09-18T14:01:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Pod te-03 updated to v1.9 and healthy — 1/3 pods on v1.9, 2/3 on v1.8"
      },
      {
        "timestamp": "2024-09-18T14:01:05.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-deploy-8810",
        "message": "Response deserialization error from trade-executor te-01 (v1.8): missing field 'settlementType' — 500 Internal Server Error"
      },
      {
        "timestamp": "2024-09-18T14:01:06.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-deploy-8810",
        "message": "Response deserialization error from trade-executor te-02 (v1.8): unexpected null on 'clearingCode'"
      },
      {
        "timestamp": "2024-09-18T14:01:10.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-deploy-8810",
        "message": "Error rate spike: 67% of /submit-trade requests returning 500 — version mismatch suspected"
      },
      {
        "timestamp": "2024-09-18T14:01:12.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deploy-8810",
        "message": "Cannot parse trade response from te-01 (v1.8) — settlement for 340 trades cannot proceed"
      },
      {
        "timestamp": "2024-09-18T14:12:00.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Deployment paused — version mismatch detected, initiating rollback to v1.8"
      },
      {
        "timestamp": "2024-09-18T14:13:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Rollback complete — all 3 pods on v1.8, API compatibility restored"
      },
      {
        "timestamp": "2024-09-18T14:13:15.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-deploy-8810",
        "message": "trade-executor responses parsing correctly — error rate returned to 0%"
      }
    ]
  },
  {
    "id": "LOG-020",
    "name": "Settlement Batch Processing Failure",
    "description": "End-of-day settlement batch generates files in SWIFT MT940 format but clearing-service expects ISO 20022 XML; all 1,847 records are rejected, putting overnight settlement at risk.",
    "logs": [
      {
        "timestamp": "2024-11-28T17:00:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "End-of-day settlement batch started — 1,847 records, format: SWIFT MT940, target: clearing-service"
      },
      {
        "timestamp": "2024-11-28T17:05:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement file generated: settlement_20241128.mt940 (1,847 records, 4.2 MB)"
      },
      {
        "timestamp": "2024-11-28T17:05:10.000Z",
        "level": "ERROR",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-settle-9920",
        "message": "File parse error: expected ISO 20022 XML (pain.013.001.07), received SWIFT MT940 — rejecting batch"
      },
      {
        "timestamp": "2024-11-28T17:05:11.000Z",
        "level": "ERROR",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement batch REJECTED: 1,847/1,847 records failed format validation — no records processed"
      },
      {
        "timestamp": "2024-11-28T17:05:12.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "Clearing rejection received for full batch — overnight settlement for 1,847 trades at risk"
      },
      {
        "timestamp": "2024-11-28T17:05:15.000Z",
        "level": "WARN",
        "service": "reporting-service",
        "instance": "rs-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement completion report cannot be generated — batch not acknowledged by clearing"
      },
      {
        "timestamp": "2024-11-28T17:05:20.000Z",
        "level": "WARN",
        "service": "audit-service",
        "instance": "as-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement failure logged — regulatory reporting required, 1,847 trades unsettled"
      },
      {
        "timestamp": "2024-11-28T18:30:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement file regenerated in SWIFT MT940 format (format reverted) — resubmitting to clearing"
      },
      {
        "timestamp": "2024-11-28T18:35:00.000Z",
        "level": "INFO",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement batch accepted — 1,847 records validated and queued for overnight processing"
      }
    ]
  }
];

export const TRIAGE_SCENARIOS: TriageScenario[] = [
  {
    "id": "INC-001",
    "title": "Market data feed stale prices — all instruments",
    "description": "Feed handler lost upstream provider connectivity. Price engine detected staleness threshold exceeded on all instruments. Orders being rejected due to stale quotes.",
    "severity": "CRITICAL",
    "affectedServices": [
      "market-data-feed",
      "price-engine",
      "order-gateway"
    ]
  },
  {
    "id": "INC-002",
    "title": "Market data feed primary/backup failover failure",
    "description": "Primary feed provider connection dropped and failover to backup provider did not trigger automatically. Automatic failover was disabled by a config change 3 days prior. All equity instruments reported no-quote for 11 minutes.",
    "severity": "CRITICAL",
    "affectedServices": [
      "market-data-feed",
      "price-engine",
      "order-gateway",
      "risk-engine"
    ]
  },
  {
    "id": "INC-003",
    "title": "Market data feed multicast packet loss — derivative instruments",
    "description": "UDP multicast packet loss reached 34% on the derivatives feed channel. Price engine began publishing synthetic mid-prices for affected options contracts. Risk engine flagged elevated VaR due to poor price quality.",
    "severity": "HIGH",
    "affectedServices": [
      "market-data-feed",
      "price-engine",
      "risk-engine"
    ]
  },
  {
    "id": "INC-004",
    "title": "Market data feed reconnect loop — FX spot prices unavailable",
    "description": "FX feed handler entered a reconnect loop after the provider rotated its TLS certificate. Handler did not trust the new certificate chain and retried every 2 seconds. FX spot prices were unavailable for 27 minutes during European open.",
    "severity": "HIGH",
    "affectedServices": [
      "market-data-feed",
      "price-engine",
      "fix-gateway"
    ]
  },
  {
    "id": "INC-005",
    "title": "Auth service JWT signing key rotation broke all sessions",
    "description": "On-call rotated the JWT signing key without coordinating with downstream consumers. All service-to-service calls returned 401 Unauthorized. Trading halted for 22 minutes.",
    "severity": "CRITICAL",
    "affectedServices": [
      "auth-service",
      "trade-executor",
      "order-gateway",
      "risk-engine"
    ]
  },
  {
    "id": "INC-006",
    "title": "Auth service crash loop — invalid Redis connection string in config",
    "description": "auth-service entered CrashLoopBackOff after a config deployment set an invalid Redis sentinel connection string. All services depending on auth returned 503. Session validation was completely unavailable.",
    "severity": "CRITICAL",
    "affectedServices": [
      "auth-service",
      "api-gateway",
      "trade-executor",
      "session-manager"
    ]
  },
  {
    "id": "INC-007",
    "title": "Auth service OAuth2 token endpoint latency spike",
    "description": "Token endpoint p99 latency rose from 80 ms to 4.2 s over 15 minutes. Client applications began hitting 30-second timeouts. Investigation revealed the user DB index had been accidentally dropped during schema migration.",
    "severity": "HIGH",
    "affectedServices": [
      "auth-service",
      "user-service",
      "api-gateway"
    ]
  },
  {
    "id": "INC-008",
    "title": "Session manager token refresh storm after auth-service restart",
    "description": "After auth-service pod restart, all active sessions attempted token refresh simultaneously. session-manager was overwhelmed with 14,000 concurrent refresh requests in under 2 seconds, causing Redis connection exhaustion.",
    "severity": "HIGH",
    "affectedServices": [
      "auth-service",
      "session-manager",
      "redis-cache"
    ]
  },
  {
    "id": "INC-009",
    "title": "Database connection pool exhausted — postgres-primary under peak load",
    "description": "trade-executor p99 latency exceeded 8 s during market open. DB connection pool saturated; new requests queued then timed out. A slow reporting query introduced in the prior deploy held connections for up to 45 seconds.",
    "severity": "HIGH",
    "affectedServices": [
      "trade-executor",
      "postgres-primary",
      "settlement-service"
    ]
  },
  {
    "id": "INC-010",
    "title": "Postgres primary replication lag — replica divergence",
    "description": "Streaming replication lag between postgres-primary and postgres-replica grew to 4.8 GB over 90 minutes. Read replicas began serving stale position data. risk-engine read stale positions and computed incorrect exposure.",
    "severity": "HIGH",
    "affectedServices": [
      "postgres-primary",
      "postgres-replica",
      "risk-engine",
      "position-service"
    ]
  },
  {
    "id": "INC-011",
    "title": "Database deadlock cascade — settlement concurrent batch jobs",
    "description": "Two concurrent settlement batch jobs acquired row locks in opposite order, producing a deadlock. Both transactions rolled back repeatedly, backing up the settlement queue to 2,400 pending items.",
    "severity": "HIGH",
    "affectedServices": [
      "settlement-service",
      "postgres-primary",
      "clearing-service"
    ]
  },
  {
    "id": "INC-012",
    "title": "Postgres primary failover — prolonged replication split-brain",
    "description": "Primary DB host was terminated by infrastructure automation due to a health check misconfiguration. Automated failover promoted the replica but replication slots were not cleaned up, causing WAL bloat to fill the disk on the new primary.",
    "severity": "CRITICAL",
    "affectedServices": [
      "postgres-primary",
      "postgres-replica",
      "trade-executor",
      "settlement-service"
    ]
  },
  {
    "id": "INC-013",
    "title": "Risk engine heap exhaustion — position cache memory leak",
    "description": "risk-engine pod restarted 3 times in 20 minutes. Heap grew steadily over 4 hours before OOM kill. GC pressure was visible 45 minutes before crash; heap profile showed expired positions not being evicted.",
    "severity": "HIGH",
    "affectedServices": [
      "risk-engine",
      "position-service"
    ]
  },
  {
    "id": "INC-014",
    "title": "GC pause storm — price-engine throughput collapse at market open",
    "description": "During peak market open, price-engine GC pause times exceeded 2.1 s, reducing effective throughput by 80%. Price updates lagged by 3–6 seconds, triggering stale-price rejections at order-gateway.",
    "severity": "HIGH",
    "affectedServices": [
      "price-engine",
      "market-data-feed",
      "order-gateway"
    ]
  },
  {
    "id": "INC-015",
    "title": "Matching engine heap OOM — order book object accumulation",
    "description": "matching-engine reported heap at 97% and then was OOM-killed. A code change introduced in the prior release did not release completed order book entries; they accumulated over the trading session.",
    "severity": "CRITICAL",
    "affectedServices": [
      "matching-engine",
      "order-gateway",
      "trade-executor"
    ]
  },
  {
    "id": "INC-016",
    "title": "GC pause causing order latency SLA breach — margin-service",
    "description": "margin-service p99 latency breached the 500 ms SLA during end-of-day margining. Investigation showed GC pauses averaging 700 ms every 90 seconds due to large object promotion in the old generation.",
    "severity": "MEDIUM",
    "affectedServices": [
      "margin-service",
      "risk-engine",
      "position-service"
    ]
  },
  {
    "id": "INC-017",
    "title": "Kafka consumer group rebalance storm — order events delayed",
    "description": "A rolling restart of the order-event consumer group triggered repeated rebalancing. 14 rebalance cycles occurred over 8 minutes, during which no consumers were assigned partitions. 9,000 order events accumulated in the topic with no processing.",
    "severity": "HIGH",
    "affectedServices": [
      "kafka-broker",
      "order-gateway",
      "trade-executor",
      "risk-engine"
    ]
  },
  {
    "id": "INC-018",
    "title": "Kafka DLQ overflow — poison pill trade confirmation messages",
    "description": "Trade confirmation consumer repeatedly failed on a batch of 240 malformed messages. After 3 retry attempts each, all 240 were routed to the dead-letter queue. DLQ consumer was not running, causing DLQ topic to hit retention limit.",
    "severity": "HIGH",
    "affectedServices": [
      "kafka-broker",
      "trade-executor",
      "settlement-service",
      "notification-service"
    ]
  },
  {
    "id": "INC-019",
    "title": "Kafka out-of-order event processing — position calculation errors",
    "description": "Position service processed trade events out of sequence after a partition reassignment. Positions for 3 accounts showed incorrect values. Downstream risk calculations used the incorrect positions for 12 minutes before detection.",
    "severity": "HIGH",
    "affectedServices": [
      "kafka-broker",
      "position-service",
      "risk-engine",
      "trade-executor"
    ]
  },
  {
    "id": "INC-020",
    "title": "Kafka broker leader election — topic unavailability during ISR shrink",
    "description": "A Kafka broker in us-east-1c ran out of disk space, causing it to leave the ISR for all partitions it led. Leader elections for 48 partitions occurred simultaneously. Producers experienced up to 30 seconds of unavailability.",
    "severity": "CRITICAL",
    "affectedServices": [
      "kafka-broker",
      "zookeeper",
      "order-gateway",
      "trade-executor"
    ]
  },
  {
    "id": "INC-021",
    "title": "Kafka consumer lag — risk-engine falls 2M messages behind",
    "description": "risk-engine Kafka consumer lag grew to 2.1 million messages over 40 minutes. Consumer throughput dropped after a CPU throttle was incorrectly applied to the pod. Real-time risk calculations became stale by up to 8 minutes.",
    "severity": "HIGH",
    "affectedServices": [
      "kafka-broker",
      "risk-engine",
      "position-service"
    ]
  },
  {
    "id": "INC-022",
    "title": "Network partition — AZ-b isolated from AZ-a (cross-AZ traffic blocked)",
    "description": "AWS us-east-1b became unreachable from us-east-1a for 8 minutes. Services with pods in both AZs experienced connection timeouts. Service mesh reported high error rates on cross-AZ calls; health checks began failing.",
    "severity": "CRITICAL",
    "affectedServices": [
      "trade-executor",
      "risk-engine",
      "order-gateway",
      "settlement-service",
      "api-gateway"
    ]
  },
  {
    "id": "INC-023",
    "title": "Service mesh mTLS certificate expiry — inter-service calls blocked",
    "description": "Istio mTLS certificates expired simultaneously across 14 services due to a cert-manager misconfiguration. All inter-service gRPC calls returned TLS handshake errors. Services degraded to local cache operation.",
    "severity": "CRITICAL",
    "affectedServices": [
      "api-gateway",
      "trade-executor",
      "risk-engine",
      "order-gateway",
      "settlement-service"
    ]
  },
  {
    "id": "INC-024",
    "title": "DNS resolution failure — service discovery breakdown",
    "description": "CoreDNS pods in the cluster experienced an OOM restart. During the 90-second restart window, service discovery via DNS failed for all inter-service calls. Services using IP-based discovery were unaffected.",
    "severity": "HIGH",
    "affectedServices": [
      "api-gateway",
      "auth-service",
      "trade-executor",
      "risk-engine"
    ]
  },
  {
    "id": "INC-025",
    "title": "Load balancer connection draining timeout — rolling restart disruption",
    "description": "During a rolling restart, the load balancer did not drain connections before pods were terminated. In-flight trade requests received connection reset errors. 340 trades required manual status reconciliation.",
    "severity": "MEDIUM",
    "affectedServices": [
      "api-gateway",
      "trade-executor",
      "order-gateway"
    ]
  },
  {
    "id": "INC-026",
    "title": "Circuit breaker open cascade — settlement-service timeout propagation",
    "description": "settlement-service latency spiked after a DB replica failover. Circuit breakers in trade-executor and clearing-service opened within 60 seconds. All settlement operations were rejected for 7 minutes while the breaker remained open.",
    "severity": "HIGH",
    "affectedServices": [
      "settlement-service",
      "trade-executor",
      "clearing-service",
      "order-gateway"
    ]
  },
  {
    "id": "INC-027",
    "title": "Circuit breaker flapping — risk-engine intermittent timeouts",
    "description": "risk-engine circuit breaker on the position-service dependency entered a rapid open/half-open/open cycle every 45 seconds for 25 minutes. Trade submission was intermittently blocked as risk checks were skipped.",
    "severity": "HIGH",
    "affectedServices": [
      "risk-engine",
      "position-service",
      "trade-executor"
    ]
  },
  {
    "id": "INC-028",
    "title": "Circuit breaker open — compliance-engine bulk timeout",
    "description": "compliance-engine circuit breaker opened on the reporting-service dependency after 5 consecutive timeouts. Compliance checks for order submission were bypassed via fallback. Regulators were notified of a 14-minute gap in real-time compliance checking.",
    "severity": "HIGH",
    "affectedServices": [
      "compliance-engine",
      "reporting-service",
      "order-gateway",
      "audit-service"
    ]
  },
  {
    "id": "INC-029",
    "title": "Circuit breaker open — notification-service SMTP relay timeout",
    "description": "notification-service circuit breaker opened after the SMTP relay became unresponsive. Trade confirmation emails and SMS alerts were queued locally. Queue depth grew to 18,000 pending notifications over 45 minutes.",
    "severity": "MEDIUM",
    "affectedServices": [
      "notification-service",
      "trade-executor",
      "settlement-service"
    ]
  },
  {
    "id": "INC-030",
    "title": "Rate limiter triggering globally — market data consumer retry flood",
    "description": "A misconfigured retry loop in market-data-consumer sent requests at full speed on 503 responses (no backoff), exhausting shared API gateway quota. 429 responses were returned to all clients including trading applications.",
    "severity": "MEDIUM",
    "affectedServices": [
      "api-gateway",
      "market-data-feed",
      "order-gateway"
    ]
  },
  {
    "id": "INC-031",
    "title": "Rate limiter misconfiguration — FIX clients blocked during high-volume session",
    "description": "A rate limiter configuration change accidentally applied an order-submission limit of 10 req/s to all FIX clients instead of 1000 req/s. Large institutional clients were throttled during a high-volume trading session.",
    "severity": "HIGH",
    "affectedServices": [
      "fix-gateway",
      "api-gateway",
      "order-gateway"
    ]
  },
  {
    "id": "INC-032",
    "title": "Risk limit breach rejection storm — desk-level position limit exceeded",
    "description": "A high-frequency algo desk exceeded its intraday position limit for US equity options. risk-engine began rejecting all new orders from the desk. 1,200 orders were rejected in 4 minutes, causing the desk to contact the operations team.",
    "severity": "HIGH",
    "affectedServices": [
      "risk-engine",
      "order-gateway",
      "position-service",
      "compliance-engine"
    ]
  },
  {
    "id": "INC-033",
    "title": "FIX protocol session drop — market maker connectivity lost",
    "description": "fix-gateway dropped FIX session with primary market maker after a heartbeat timeout. The market maker's quotes were withdrawn from the order book. Spread widened significantly for 18 minutes before the session was re-established.",
    "severity": "HIGH",
    "affectedServices": [
      "fix-gateway",
      "order-gateway",
      "matching-engine"
    ]
  },
  {
    "id": "INC-034",
    "title": "FIX logon sequence error — duplicate CompID causing session rejection",
    "description": "A new fix-gateway instance was deployed with a CompID that conflicted with an existing session. The FIX counterparty rejected logon for both sessions. The original market participant was disconnected for 6 minutes.",
    "severity": "MEDIUM",
    "affectedServices": [
      "fix-gateway",
      "order-gateway"
    ]
  },
  {
    "id": "INC-035",
    "title": "Margin call processing failure — batch job timeout",
    "description": "End-of-day margin call processing job timed out after 4 hours, exceeding its 3-hour SLA. 847 accounts did not receive margin calls. Risk team had to manually trigger margin calls and notify clients.",
    "severity": "CRITICAL",
    "affectedServices": [
      "margin-service",
      "position-service",
      "risk-engine",
      "notification-service"
    ]
  },
  {
    "id": "INC-036",
    "title": "Compliance rule engine timeout — pre-trade check SLA breach",
    "description": "compliance-engine pre-trade checks began timing out (>500 ms) for orders involving sanctions-screened counterparties. 3,400 orders were delayed beyond the 200 ms SLA. Two orders were auto-rejected due to timeout fallback policy.",
    "severity": "HIGH",
    "affectedServices": [
      "compliance-engine",
      "order-gateway",
      "audit-service"
    ]
  },
  {
    "id": "INC-037",
    "title": "Risk VaR calculation spike — incorrect historical data feed",
    "description": "risk-engine computed VaR values 3x normal for all portfolios due to incorrect historical volatility data injected by a faulty data pipeline. Several desks received erroneous margin top-up notifications.",
    "severity": "HIGH",
    "affectedServices": [
      "risk-engine",
      "market-data-feed",
      "margin-service",
      "notification-service"
    ]
  },
  {
    "id": "INC-038",
    "title": "Bad config push — config-service pushed null environment variables",
    "description": "A config-service deployment pushed a YAML file with null values for 12 critical environment variables. Dependent services (order-gateway, risk-engine) read empty strings and failed to connect to their dependencies.",
    "severity": "CRITICAL",
    "affectedServices": [
      "config-service",
      "order-gateway",
      "risk-engine",
      "trade-executor"
    ]
  },
  {
    "id": "INC-039",
    "title": "Rolling deployment version mismatch — API contract breaking change",
    "description": "A rolling deployment of trade-executor introduced a breaking change in the internal trade submission API. Old pods (v1.8) and new pods (v1.9) ran simultaneously for 12 minutes. Calls routed to old pods failed when downstream services sent v1.9 payloads.",
    "severity": "HIGH",
    "affectedServices": [
      "trade-executor",
      "order-gateway",
      "settlement-service"
    ]
  },
  {
    "id": "INC-040",
    "title": "Config-service unavailability — services unable to reload runtime config",
    "description": "config-service became unavailable for 35 minutes after an AWS EBS volume detachment. Services using dynamic config reload began operating with stale config. A risk limit change made during the outage was not propagated.",
    "severity": "MEDIUM",
    "affectedServices": [
      "config-service",
      "risk-engine",
      "order-gateway",
      "compliance-engine"
    ]
  },
  {
    "id": "INC-041",
    "title": "Order gateway matching engine disconnect — orders queuing without execution",
    "description": "order-gateway lost its gRPC connection to matching-engine after a network blip. Orders continued to be accepted and queued locally. 4,200 orders accumulated without execution for 6 minutes before the disconnect was detected.",
    "severity": "CRITICAL",
    "affectedServices": [
      "order-gateway",
      "matching-engine",
      "trade-executor"
    ]
  },
  {
    "id": "INC-042",
    "title": "Matching engine order book corruption — sequence gap under failover",
    "description": "matching-engine primary failed over to standby during peak trading. A 3-second sequence gap in order events occurred during failover. Post-failover reconciliation found 12 orders in an inconsistent state between order-gateway and matching-engine.",
    "severity": "CRITICAL",
    "affectedServices": [
      "matching-engine",
      "order-gateway",
      "trade-executor",
      "audit-service"
    ]
  },
  {
    "id": "INC-043",
    "title": "Order gateway rate limiting — algorithmic client exceeded TPS quota",
    "description": "An algorithmic client submitted orders at 4,200 TPS, exceeding their contractual 1,000 TPS quota. order-gateway rate limiter triggered correctly, but the client's retry logic caused a 12x amplification in connection attempts, overwhelming the gateway's connection pool.",
    "severity": "MEDIUM",
    "affectedServices": [
      "order-gateway",
      "api-gateway",
      "matching-engine"
    ]
  },
  {
    "id": "INC-044",
    "title": "Settlement batch failure — clearing-service file format rejection",
    "description": "End-of-day settlement batch generated clearing files in SWIFT MT940 format but clearing-service expected ISO 20022 XML. All 1,847 settlement records were rejected. Overnight settlement was at risk.",
    "severity": "CRITICAL",
    "affectedServices": [
      "settlement-service",
      "clearing-service",
      "reporting-service"
    ]
  },
  {
    "id": "INC-045",
    "title": "Settlement service position reconciliation mismatch — day-end discrepancy",
    "description": "Day-end position reconciliation between settlement-service and position-service found 23 accounts with mismatched net positions. Discrepancy was traced to a 4-minute window during which Kafka consumer offset commit failures caused duplicate position updates.",
    "severity": "HIGH",
    "affectedServices": [
      "settlement-service",
      "position-service",
      "kafka-broker",
      "clearing-service"
    ]
  }
];

export const ROOT_CAUSE_SCENARIOS: RootCauseScenario[] = [
  {
    "id": "LOG-001",
    "name": "Market Data Feed Timeout Cascade",
    "title": "Market data feed stale prices — all instruments",
    "description": "Feed handler lost upstream provider connectivity. Price engine detected staleness threshold exceeded on all instruments. Orders being rejected due to stale quotes.",
    "severity": "CRITICAL",
    "affectedServices": [
      "market-data-feed",
      "price-engine",
      "order-gateway"
    ],
    "logs": [
      {
        "timestamp": "2024-01-15T09:01:00.000Z",
        "level": "WARN",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-8821",
        "message": "Upstream provider heartbeat timeout after 10s — initiating reconnect"
      },
      {
        "timestamp": "2024-01-15T09:01:05.000Z",
        "level": "ERROR",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-8821",
        "message": "Feed provider TCP connection lost after 3 retries — marking provider UNAVAILABLE"
      },
      {
        "timestamp": "2024-01-15T09:01:08.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "Price staleness threshold exceeded for AAPL — last update 13s ago (limit: 10s)"
      },
      {
        "timestamp": "2024-01-15T09:01:12.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "Price staleness detected on 87 instruments — suspending dissemination"
      },
      {
        "timestamp": "2024-01-15T09:01:15.000Z",
        "level": "ERROR",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "Stale price threshold exceeded on 142 instruments — halting all price dissemination"
      },
      {
        "timestamp": "2024-01-15T09:01:18.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-8821",
        "message": "Order rejected: stale price on AAPL — price age 19s exceeds maximum 10s"
      },
      {
        "timestamp": "2024-01-15T09:01:19.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-8821",
        "message": "Order rejected: stale price on TSLA — price age 20s exceeds maximum 10s"
      },
      {
        "timestamp": "2024-01-15T09:01:22.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-8821",
        "message": "Order rejection rate: 98% — no valid prices available for 139 instruments"
      },
      {
        "timestamp": "2024-01-15T09:01:40.000Z",
        "level": "INFO",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-8821",
        "message": "Reconnection to feed provider successful — resuming price updates"
      },
      {
        "timestamp": "2024-01-15T09:01:55.000Z",
        "level": "INFO",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-8821",
        "message": "All instruments refreshed — resuming normal price dissemination"
      }
    ],
    "alerts": [
      {
        "alertName": "StalePriceThresholdBreached",
        "severity": "CRITICAL",
        "service": "price-engine",
        "firedAt": "2024-01-15T09:01:14.000Z",
        "description": "Stale price detected across 142 instruments",
        "value": "19s",
        "threshold": "10s"
      },
      {
        "alertName": "FeedHandlerDisconnected",
        "severity": "HIGH",
        "service": "market-data-feed",
        "firedAt": "2024-01-15T09:01:06.000Z",
        "description": "Upstream feed TCP connection lost after 3 retries"
      }
    ]
  },
  {
    "id": "LOG-002",
    "name": "Auth Service JWT Key Rotation Failure",
    "title": "Auth service JWT signing key rotation broke all sessions",
    "description": "On-call rotated the JWT signing key without coordinating with downstream consumers. All service-to-service calls returned 401 Unauthorized. Trading halted for 22 minutes.",
    "severity": "CRITICAL",
    "affectedServices": [
      "auth-service",
      "trade-executor",
      "order-gateway",
      "risk-engine"
    ],
    "logs": [
      {
        "timestamp": "2024-01-16T11:00:00.000Z",
        "level": "INFO",
        "service": "auth-service",
        "instance": "auth-01",
        "traceId": "trc-9001",
        "message": "JWT signing key rotation initiated — new key ID: k-2024-jan-16, old key ID: k-2024-jan-01"
      },
      {
        "timestamp": "2024-01-16T11:00:02.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-9001",
        "message": "Token validation failed: signature verification error — key ID mismatch (expected k-2024-jan-01)"
      },
      {
        "timestamp": "2024-01-16T11:00:02.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-9001",
        "message": "Service token refresh rejected: 401 Unauthorized from auth-service — cached public key invalid"
      },
      {
        "timestamp": "2024-01-16T11:00:03.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-9001",
        "message": "Inbound request rejected: 401 Unauthorized — JWT signature verification failed"
      },
      {
        "timestamp": "2024-01-16T11:00:04.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-9001",
        "message": "401 error rate: 89% across all downstream services in last 10s — possible auth outage"
      },
      {
        "timestamp": "2024-01-16T11:00:06.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-9001",
        "message": "Authorization failed on inter-service call to trade-executor: 401 — halting settlement processing"
      },
      {
        "timestamp": "2024-01-16T11:00:08.000Z",
        "level": "WARN",
        "service": "auth-service",
        "instance": "auth-01",
        "traceId": "trc-9001",
        "message": "High volume of token validation failures detected — 2,340 failures in 8s"
      },
      {
        "timestamp": "2024-01-16T11:22:00.000Z",
        "level": "INFO",
        "service": "auth-service",
        "instance": "auth-01",
        "traceId": "trc-9001",
        "message": "New JWKS public key pushed to all registered consumers — key rotation complete"
      },
      {
        "timestamp": "2024-01-16T11:22:15.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-9001",
        "message": "Token re-validated successfully with new key ID k-2024-jan-16 — resuming operations"
      }
    ],
    "alerts": [
      {
        "alertName": "JWTValidationErrorRate",
        "severity": "CRITICAL",
        "service": "auth-service",
        "firedAt": "2024-01-16T11:00:05.000Z",
        "description": "JWT token validation errors > 80% in 30s window",
        "value": "89%",
        "threshold": "5%"
      },
      {
        "alertName": "ServiceAuthFailures",
        "severity": "HIGH",
        "service": "trade-executor",
        "firedAt": "2024-01-16T11:00:08.000Z",
        "description": "Inter-service auth failures causing cascading 401 errors"
      }
    ]
  },
  {
    "id": "LOG-003",
    "name": "Database Connection Pool Exhaustion",
    "title": "Database connection pool exhausted — postgres-primary under peak load",
    "description": "trade-executor p99 latency exceeded 8 s during market open. DB connection pool saturated; new requests queued then timed out. A slow reporting query introduced in the prior deploy held connections for up to 45 seconds.",
    "severity": "HIGH",
    "affectedServices": [
      "trade-executor",
      "postgres-primary",
      "settlement-service"
    ],
    "logs": [
      {
        "timestamp": "2024-01-20T14:05:00.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-pool-2240",
        "message": "Slow query detected: SELECT * FROM trades WHERE trade_date > ? ORDER BY instrument_id — execution time 4200ms"
      },
      {
        "timestamp": "2024-01-20T14:05:08.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-02",
        "traceId": "trc-pool-2240",
        "message": "DB connection pool: 43/50 connections in use — approaching saturation"
      },
      {
        "timestamp": "2024-01-20T14:05:18.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-pool-2240",
        "message": "DB connection pool exhausted: 50/50 connections in use — new requests queuing"
      },
      {
        "timestamp": "2024-01-20T14:05:22.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-pool-2240",
        "message": "Connection acquire timeout after 5000ms — pool queue depth: 87 waiting requests"
      },
      {
        "timestamp": "2024-01-20T14:05:25.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-pool-2240",
        "message": "trade-executor p99 latency: 8200ms — SLA threshold is 500ms"
      },
      {
        "timestamp": "2024-01-20T14:05:28.000Z",
        "level": "ERROR",
        "service": "postgres-primary",
        "instance": "pg-01",
        "traceId": "trc-pool-2240",
        "message": "Max connections reached: 100/100 — new connection refused (ERROR 1040)"
      },
      {
        "timestamp": "2024-01-20T14:05:32.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-pool-2240",
        "message": "Settlement batch delayed — waiting for trade-executor to recover (delay: 4min)"
      },
      {
        "timestamp": "2024-01-20T14:40:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-pool-2240",
        "message": "Index added on (trade_date, instrument_id) — query execution time reduced to 12ms"
      }
    ],
    "alerts": [
      {
        "alertName": "DBConnectionPoolSaturation",
        "severity": "HIGH",
        "service": "postgres-primary",
        "firedAt": "2024-02-20T14:30:15.000Z",
        "description": "Connection pool at 100% — new requests queuing",
        "value": "100%",
        "threshold": "80%"
      },
      {
        "alertName": "TradeExecutorLatencyP99",
        "severity": "HIGH",
        "service": "trade-executor",
        "firedAt": "2024-02-20T14:30:20.000Z",
        "description": "p99 latency exceeded 8s SLA",
        "value": "8.2s",
        "threshold": "2s"
      }
    ]
  },
  {
    "id": "LOG-004",
    "name": "Database Deadlock Cascade",
    "title": "Database deadlock cascade — settlement concurrent batch jobs",
    "description": "Two concurrent settlement batch jobs acquired row locks in opposite order, producing a deadlock. Both transactions rolled back repeatedly, backing up the settlement queue to 2,400 pending items.",
    "severity": "HIGH",
    "affectedServices": [
      "settlement-service",
      "postgres-primary",
      "clearing-service"
    ],
    "logs": [
      {
        "timestamp": "2024-02-05T16:00:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Settlement batch job A started — processing instruments: AAPL, MSFT, GOOGL (87 records)"
      },
      {
        "timestamp": "2024-02-05T16:00:01.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-deadlock-441",
        "message": "Settlement batch job B started — processing instruments: GOOGL, MSFT, AAPL (92 records)"
      },
      {
        "timestamp": "2024-02-05T16:00:04.000Z",
        "level": "WARN",
        "service": "postgres-primary",
        "instance": "pg-01",
        "traceId": "trc-deadlock-440",
        "message": "Deadlock detected: transaction 440 waiting on lock held by transaction 441 — circular wait"
      },
      {
        "timestamp": "2024-02-05T16:00:04.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Deadlock exception on settlement write: ERROR 1213 — transaction rolled back, retrying in 500ms"
      },
      {
        "timestamp": "2024-02-05T16:00:05.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-deadlock-441",
        "message": "Deadlock exception on settlement write: ERROR 1213 — transaction rolled back, retrying in 500ms"
      },
      {
        "timestamp": "2024-02-05T16:00:10.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Deadlock retry 3/3 failed — batch job A aborting; 87 records unprocessed"
      },
      {
        "timestamp": "2024-02-05T16:00:12.000Z",
        "level": "WARN",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-deadlock-440",
        "message": "Settlement queue depth: 2,412 pending records — processing halted"
      },
      {
        "timestamp": "2024-02-05T16:25:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deadlock-440",
        "message": "Deterministic lock ordering applied (sorted by instrument_id) — deadlock resolved, reprocessing batch"
      }
    ]
  },
  {
    "id": "LOG-005",
    "name": "Memory Heap Exhaustion OOM Kill",
    "title": "Matching engine heap OOM — order book object accumulation",
    "description": "matching-engine reported heap at 97% and then was OOM-killed. A code change introduced in the prior release did not release completed order book entries; they accumulated over the trading session.",
    "severity": "CRITICAL",
    "affectedServices": [
      "matching-engine",
      "order-gateway",
      "trade-executor"
    ],
    "logs": [
      {
        "timestamp": "2024-01-17T08:00:00.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 42% (840 MB / 2 GB) — GC activity nominal"
      },
      {
        "timestamp": "2024-01-17T09:00:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 68% (1360 MB / 2 GB) — minor GC pause 220ms, position cache entries: 148,000"
      },
      {
        "timestamp": "2024-01-17T10:00:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 81% (1620 MB / 2 GB) — GC pause 540ms, position cache entries: 312,000"
      },
      {
        "timestamp": "2024-01-17T10:12:00.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Heap usage: 97% (1940 MB / 2 GB) — full GC pause 2100ms, application threads stopped"
      },
      {
        "timestamp": "2024-01-17T10:15:00.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "FATAL: java.lang.OutOfMemoryError: Java heap space — process killed by OOM killer"
      },
      {
        "timestamp": "2024-01-17T10:15:05.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-02",
        "traceId": "trc-oom-5501",
        "message": "risk-engine unreachable — connection refused on port 8082, marking as DOWN"
      },
      {
        "timestamp": "2024-01-17T10:15:08.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-oom-5501",
        "message": "Pre-trade risk check failed: risk-engine unavailable — orders held pending recovery"
      },
      {
        "timestamp": "2024-01-17T10:15:30.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Pod restarted by Kubernetes — waiting for readiness probe (timeout: 60s)"
      },
      {
        "timestamp": "2024-01-17T10:16:15.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-oom-5501",
        "message": "Readiness probe passed — resuming risk calculations with clean position cache"
      }
    ],
    "alerts": [
      {
        "alertName": "MatchingEngineHeapCritical",
        "severity": "CRITICAL",
        "service": "matching-engine",
        "firedAt": "2024-03-10T10:45:00.000Z",
        "description": "Heap usage at 97% — OOM imminent",
        "value": "97%",
        "threshold": "90%"
      },
      {
        "alertName": "MatchingEnginePodRestart",
        "severity": "CRITICAL",
        "service": "matching-engine",
        "firedAt": "2024-03-10T10:47:00.000Z",
        "description": "Pod OOM-killed and restarting"
      }
    ]
  },
  {
    "id": "LOG-006",
    "name": "GC Pause Storm Causing Timeouts",
    "title": "GC pause storm — price-engine throughput collapse at market open",
    "description": "During peak market open, price-engine GC pause times exceeded 2.1 s, reducing effective throughput by 80%. Price updates lagged by 3–6 seconds, triggering stale-price rejections at order-gateway.",
    "severity": "HIGH",
    "affectedServices": [
      "price-engine",
      "market-data-feed",
      "order-gateway"
    ],
    "logs": [
      {
        "timestamp": "2024-03-15T09:30:00.000Z",
        "level": "INFO",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "Market open: processing 48,000 price updates/sec — heap at 55%"
      },
      {
        "timestamp": "2024-03-15T09:30:05.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "GC pause 820ms — young generation exhausted, allocation rate: 4.2 GB/s"
      },
      {
        "timestamp": "2024-03-15T09:30:12.000Z",
        "level": "WARN",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "GC pause 1350ms — full GC triggered, throughput dropped to 12,000 updates/sec"
      },
      {
        "timestamp": "2024-03-15T09:30:15.000Z",
        "level": "ERROR",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "GC pause 2100ms — application threads stopped, price dissemination suspended for 2.1s"
      },
      {
        "timestamp": "2024-03-15T09:30:17.000Z",
        "level": "WARN",
        "service": "market-data-feed",
        "instance": "feed-01",
        "traceId": "trc-gc-7721",
        "message": "price-engine not consuming — feed buffer growing: 14,200 queued messages"
      },
      {
        "timestamp": "2024-03-15T09:30:18.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-gc-7721",
        "message": "Stale price detected on MSFT — last update 3.8s ago (limit 1s) — order rejected"
      },
      {
        "timestamp": "2024-03-15T09:30:20.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-gc-7721",
        "message": "Order rejection rate: 71% — GC pauses causing systemic stale price condition"
      },
      {
        "timestamp": "2024-03-15T10:15:00.000Z",
        "level": "INFO",
        "service": "price-engine",
        "instance": "pe-01",
        "traceId": "trc-gc-7721",
        "message": "Object pooling enabled in price normalisation hot path — GC pause reduced to 48ms"
      }
    ]
  },
  {
    "id": "LOG-007",
    "name": "Kafka Consumer Group Rebalance Storm",
    "title": "Kafka consumer group rebalance storm — order events delayed",
    "description": "A rolling restart of the order-event consumer group triggered repeated rebalancing. 14 rebalance cycles occurred over 8 minutes, during which no consumers were assigned partitions. 9,000 order events accumulated in the topic with no processing.",
    "severity": "HIGH",
    "affectedServices": [
      "kafka-broker",
      "order-gateway",
      "trade-executor",
      "risk-engine"
    ],
    "logs": [
      {
        "timestamp": "2024-02-20T13:00:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-rebal-3310",
        "message": "Rolling restart initiated for order-event-consumer group (3 pods)"
      },
      {
        "timestamp": "2024-02-20T13:00:05.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance triggered — member te-01 left group"
      },
      {
        "timestamp": "2024-02-20T13:00:08.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance #1 complete — 12 partitions assigned to 2 members"
      },
      {
        "timestamp": "2024-02-20T13:00:15.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance #2 triggered — member te-02 session timeout (10s)"
      },
      {
        "timestamp": "2024-02-20T13:00:22.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-02",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: rebalance #5 — all members left, no partitions assigned"
      },
      {
        "timestamp": "2024-02-20T13:00:25.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rebal-3310",
        "message": "order-event-consumer lag: 4,200 messages — consumer group in rebalance, no processing"
      },
      {
        "timestamp": "2024-02-20T13:08:00.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rebal-3310",
        "message": "order-event-consumer lag: 9,100 messages — 8 minutes without processing"
      },
      {
        "timestamp": "2024-02-20T13:08:30.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer group order-event-consumer: stable — 12 partitions assigned to 3 members"
      },
      {
        "timestamp": "2024-02-20T13:12:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-rebal-3310",
        "message": "Consumer lag cleared — 9,100 events processed, all partitions caught up"
      }
    ],
    "alerts": [
      {
        "alertName": "KafkaConsumerLagHigh",
        "severity": "HIGH",
        "service": "kafka-broker",
        "firedAt": "2024-04-05T09:31:00.000Z",
        "description": "Consumer group rebalancing — no partitions assigned",
        "value": "9000 msgs",
        "threshold": "1000 msgs"
      },
      {
        "alertName": "OrderEventProcessingDelay",
        "severity": "HIGH",
        "service": "trade-executor",
        "firedAt": "2024-04-05T09:32:00.000Z",
        "description": "Order events not being consumed during rebalance storm"
      }
    ]
  },
  {
    "id": "LOG-008",
    "name": "Kafka DLQ Overflow Poison Pill Messages",
    "title": "Kafka DLQ overflow — poison pill trade confirmation messages",
    "description": "Trade confirmation consumer repeatedly failed on a batch of 240 malformed messages. After 3 retry attempts each, all 240 were routed to the dead-letter queue. DLQ consumer was not running, causing DLQ topic to hit retention limit.",
    "severity": "HIGH",
    "affectedServices": [
      "kafka-broker",
      "trade-executor",
      "settlement-service",
      "notification-service"
    ],
    "logs": [
      {
        "timestamp": "2024-03-10T10:00:00.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Deserialization error on trade-confirmations topic partition 3 offset 44201: unknown field 'settlementCurrency'"
      },
      {
        "timestamp": "2024-03-10T10:00:02.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Retrying message (attempt 1/3) — offset 44201, topic: trade-confirmations"
      },
      {
        "timestamp": "2024-03-10T10:00:06.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Retrying message (attempt 2/3) — offset 44201, same deserialization error persists"
      },
      {
        "timestamp": "2024-03-10T10:00:10.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-dlq-8801",
        "message": "Message retry exhausted (3/3) — routing to DLQ: trade-confirmations.dlq, offset 44201"
      },
      {
        "timestamp": "2024-03-10T10:00:12.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-02",
        "traceId": "trc-dlq-8801",
        "message": "DLQ topic trade-confirmations.dlq: 48 messages, consumer group dlq-consumer has 0 active members"
      },
      {
        "timestamp": "2024-03-10T10:30:00.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-02",
        "traceId": "trc-dlq-8801",
        "message": "DLQ topic trade-confirmations.dlq: 240 messages — approaching retention limit (500 messages)"
      },
      {
        "timestamp": "2024-03-10T10:30:05.000Z",
        "level": "ERROR",
        "service": "notification-service",
        "instance": "ns-01",
        "traceId": "trc-dlq-8801",
        "message": "240 trade confirmations not delivered — clients may not receive settlement notifications"
      },
      {
        "timestamp": "2024-03-10T11:15:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-dlq-8801",
        "message": "Schema-compatible consumer deployed — replaying DLQ: 240 messages, estimated 4 min"
      },
      {
        "timestamp": "2024-03-10T11:19:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-dlq-8801",
        "message": "DLQ replay complete — 240 messages processed successfully"
      }
    ]
  },
  {
    "id": "LOG-009",
    "name": "Out-of-Order Kafka Event Processing",
    "title": "Kafka out-of-order event processing — position calculation errors",
    "description": "Position service processed trade events out of sequence after a partition reassignment. Positions for 3 accounts showed incorrect values. Downstream risk calculations used the incorrect positions for 12 minutes before detection.",
    "severity": "HIGH",
    "affectedServices": [
      "kafka-broker",
      "position-service",
      "risk-engine",
      "trade-executor"
    ],
    "logs": [
      {
        "timestamp": "2024-04-08T14:00:00.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-ooo-6610",
        "message": "Partition reassignment initiated for topic trade-events — moving partition 7 from broker-2 to broker-3"
      },
      {
        "timestamp": "2024-04-08T14:00:03.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Duplicate message detected: trade-event seq=88441 already processed — reprocessing due to partition reassignment"
      },
      {
        "timestamp": "2024-04-08T14:00:04.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-02",
        "traceId": "trc-ooo-6610",
        "message": "Out-of-order event: trade seq=88443 received before seq=88442 — position calculation may be incorrect"
      },
      {
        "timestamp": "2024-04-08T14:00:06.000Z",
        "level": "ERROR",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Position inconsistency detected for account ACC-7841: expected net=+1500 AAPL, calculated net=+3000 AAPL"
      },
      {
        "timestamp": "2024-04-08T14:00:08.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-ooo-6610",
        "message": "VaR calculation using stale/incorrect position data for 3 accounts — results unreliable"
      },
      {
        "timestamp": "2024-04-08T14:00:10.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Idempotency check failure on 23 position updates — duplicate processing window: 4 minutes"
      },
      {
        "timestamp": "2024-04-08T14:12:00.000Z",
        "level": "INFO",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Transactional outbox pattern activated — sequence validation enabled, idempotency keys enforced"
      },
      {
        "timestamp": "2024-04-08T14:15:00.000Z",
        "level": "INFO",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-ooo-6610",
        "message": "Position reconciliation complete — 23 affected accounts corrected"
      }
    ]
  },
  {
    "id": "LOG-010",
    "name": "Kafka Broker Leader Election During Disk Exhaustion",
    "title": "Kafka broker leader election — topic unavailability during ISR shrink",
    "description": "A Kafka broker in us-east-1c ran out of disk space, causing it to leave the ISR for all partitions it led. Leader elections for 48 partitions occurred simultaneously. Producers experienced up to 30 seconds of unavailability.",
    "severity": "CRITICAL",
    "affectedServices": [
      "kafka-broker",
      "zookeeper",
      "order-gateway",
      "trade-executor"
    ],
    "logs": [
      {
        "timestamp": "2024-05-02T08:00:00.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Broker disk usage: 75% (750 GB / 1 TB) on /var/kafka/logs — monitor closely"
      },
      {
        "timestamp": "2024-05-02T11:30:00.000Z",
        "level": "WARN",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Broker disk usage: 92% (920 GB / 1 TB) — market-event topic has no retention.bytes configured"
      },
      {
        "timestamp": "2024-05-02T13:45:00.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Disk full: 100% utilisation — broker shutting down log flushing, leaving ISR for all partitions"
      },
      {
        "timestamp": "2024-05-02T13:45:05.000Z",
        "level": "ERROR",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-leader-9901",
        "message": "ISR shrink detected for 48 partitions — initiating leader elections"
      },
      {
        "timestamp": "2024-05-02T13:45:08.000Z",
        "level": "ERROR",
        "service": "zookeeper",
        "instance": "zk-01",
        "traceId": "trc-leader-9901",
        "message": "48 concurrent leader elections in progress — ZooKeeper under heavy write load"
      },
      {
        "timestamp": "2024-05-02T13:45:10.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-leader-9901",
        "message": "Kafka producer: LEADER_NOT_AVAILABLE on market-event topic — order events cannot be published"
      },
      {
        "timestamp": "2024-05-02T13:45:12.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-leader-9901",
        "message": "Kafka producer error: NotLeaderForPartitionException — retrying with backoff"
      },
      {
        "timestamp": "2024-05-02T14:17:00.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-03",
        "traceId": "trc-leader-9901",
        "message": "Disk cleared (200 GB freed) — broker rejoining cluster, log retention.bytes=50GB applied"
      },
      {
        "timestamp": "2024-05-02T14:20:00.000Z",
        "level": "INFO",
        "service": "kafka-broker",
        "instance": "kb-01",
        "traceId": "trc-leader-9901",
        "message": "All 48 partitions have elected stable leaders — producer availability restored"
      }
    ],
    "alerts": [
      {
        "alertName": "KafkaBrokerOffline",
        "severity": "CRITICAL",
        "service": "kafka-broker",
        "firedAt": "2024-05-12T11:40:00.000Z",
        "description": "Broker left ISR due to disk exhaustion",
        "value": "100%",
        "threshold": "85%"
      },
      {
        "alertName": "KafkaLeaderElectionCount",
        "severity": "CRITICAL",
        "service": "kafka-broker",
        "firedAt": "2024-05-12T11:40:05.000Z",
        "description": "48 leader elections in progress simultaneously"
      }
    ]
  },
  {
    "id": "LOG-011",
    "name": "Network Partition Between AZs",
    "title": "Network partition — AZ-b isolated from AZ-a (cross-AZ traffic blocked)",
    "description": "AWS us-east-1b became unreachable from us-east-1a for 8 minutes. Services with pods in both AZs experienced connection timeouts. Service mesh reported high error rates on cross-AZ calls; health checks began failing.",
    "severity": "CRITICAL",
    "affectedServices": [
      "trade-executor",
      "risk-engine",
      "order-gateway",
      "settlement-service",
      "api-gateway"
    ],
    "logs": [
      {
        "timestamp": "2024-06-10T15:00:00.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-02",
        "traceId": "trc-npart-1100",
        "message": "Health check failing for trade-executor in us-east-1b — connection timeout after 5s"
      },
      {
        "timestamp": "2024-06-10T15:00:02.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-npart-1100",
        "message": "Cannot reach postgres-primary in us-east-1a — TCP connect timeout after 10s"
      },
      {
        "timestamp": "2024-06-10T15:00:03.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-02",
        "traceId": "trc-npart-1100",
        "message": "position-service unreachable (us-east-1a) — gRPC connection reset, error: UNAVAILABLE"
      },
      {
        "timestamp": "2024-06-10T15:00:05.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-npart-1100",
        "message": "Cross-AZ call to matching-engine failed — connection refused, circuit breaker opening"
      },
      {
        "timestamp": "2024-06-10T15:00:06.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-02",
        "traceId": "trc-npart-1100",
        "message": "clearing-service (us-east-1a) unreachable — all settlement operations halted"
      },
      {
        "timestamp": "2024-06-10T15:00:08.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-npart-1100",
        "message": "AZ partition suspected — 100% cross-AZ call failure, routing to single-AZ failover"
      },
      {
        "timestamp": "2024-06-10T15:08:00.000Z",
        "level": "INFO",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-npart-1100",
        "message": "AWS ACL rule reverted — cross-AZ connectivity restored"
      },
      {
        "timestamp": "2024-06-10T15:08:15.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-npart-1100",
        "message": "postgres-primary connection re-established — resuming normal operations"
      }
    ],
    "alerts": [
      {
        "alertName": "CrossAZLatencySpike",
        "severity": "CRITICAL",
        "service": "api-gateway",
        "firedAt": "2024-06-18T14:05:00.000Z",
        "description": "Cross-AZ p99 latency > 5s (baseline 8ms)",
        "value": "5.2s",
        "threshold": "50ms"
      },
      {
        "alertName": "ServiceMeshErrorRate",
        "severity": "CRITICAL",
        "service": "trade-executor",
        "firedAt": "2024-06-18T14:05:10.000Z",
        "description": "Sidecar proxy reporting 94% error rate on cross-AZ calls",
        "value": "94%",
        "threshold": "1%"
      }
    ]
  },
  {
    "id": "LOG-012",
    "name": "Circuit Breaker Open Cascade",
    "title": "Circuit breaker open cascade — settlement-service timeout propagation",
    "description": "settlement-service latency spiked after a DB replica failover. Circuit breakers in trade-executor and clearing-service opened within 60 seconds. All settlement operations were rejected for 7 minutes while the breaker remained open.",
    "severity": "HIGH",
    "affectedServices": [
      "settlement-service",
      "trade-executor",
      "clearing-service",
      "order-gateway"
    ],
    "logs": [
      {
        "timestamp": "2024-01-18T14:00:00.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-cb-7001",
        "message": "DB replica failover detected — switching to standby replica, latency elevated"
      },
      {
        "timestamp": "2024-01-18T14:00:05.000Z",
        "level": "WARN",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-cb-7001",
        "message": "Latency spike: p99=4800ms (threshold 500ms) — serving degraded"
      },
      {
        "timestamp": "2024-01-18T14:00:10.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cb-7001",
        "message": "settlement-service call timeout after 2000ms — circuit breaker failure count: 3/5"
      },
      {
        "timestamp": "2024-01-18T14:00:15.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cb-7001",
        "message": "Circuit breaker OPEN on settlement-service — all settlement calls will be rejected for 30s"
      },
      {
        "timestamp": "2024-01-18T14:00:17.000Z",
        "level": "ERROR",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-cb-7001",
        "message": "settlement-service circuit breaker OPEN — clearing operations suspended"
      },
      {
        "timestamp": "2024-01-18T14:00:18.000Z",
        "level": "WARN",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-cb-7001",
        "message": "Post-trade flow degraded — settlement confirmation unavailable, trades queuing"
      },
      {
        "timestamp": "2024-01-18T14:07:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-cb-7001",
        "message": "DB failover complete — standby fully promoted, latency normalised to p99=45ms"
      },
      {
        "timestamp": "2024-01-18T14:07:30.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cb-7001",
        "message": "Circuit breaker HALF-OPEN — probe request succeeded, transitioning to CLOSED"
      }
    ],
    "alerts": [
      {
        "alertName": "SettlementCircuitBreakerOpen",
        "severity": "HIGH",
        "service": "settlement-service",
        "firedAt": "2024-07-22T16:10:00.000Z",
        "description": "Circuit breaker opened after 5 consecutive timeout failures"
      },
      {
        "alertName": "SettlementServiceLatency",
        "severity": "HIGH",
        "service": "settlement-service",
        "firedAt": "2024-07-22T16:09:50.000Z",
        "description": "p99 latency spiked to 12s after DB replica failover",
        "value": "12s",
        "threshold": "500ms"
      }
    ]
  },
  {
    "id": "LOG-013",
    "name": "Rate Limiter Triggering Under Load Spike",
    "title": "Rate limiter triggering globally — market data consumer retry flood",
    "description": "A misconfigured retry loop in market-data-consumer sent requests at full speed on 503 responses (no backoff), exhausting shared API gateway quota. 429 responses were returned to all clients including trading applications.",
    "severity": "MEDIUM",
    "affectedServices": [
      "api-gateway",
      "market-data-feed",
      "order-gateway"
    ],
    "logs": [
      {
        "timestamp": "2024-07-22T09:30:00.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "Order submission rate from client ALGO-412: 4,200 TPS (quota: 1,000 TPS)"
      },
      {
        "timestamp": "2024-07-22T09:30:01.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-rl-5540",
        "message": "Rate limit threshold exceeded for ALGO-412 — issuing 429 Too Many Requests"
      },
      {
        "timestamp": "2024-07-22T09:30:01.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "ALGO-412 retry storm: 12,400 connection attempts in 1s following 429 response (no backoff)"
      },
      {
        "timestamp": "2024-07-22T09:30:02.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "Connection pool exhausted: 500/500 — legitimate clients receiving connection refused"
      },
      {
        "timestamp": "2024-07-22T09:30:03.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-rl-5540",
        "message": "Connection pool exhausted: 500/500 — spillover to og-02 also exhausted"
      },
      {
        "timestamp": "2024-07-22T09:30:04.000Z",
        "level": "WARN",
        "service": "matching-engine",
        "instance": "me-01",
        "traceId": "trc-rl-5540",
        "message": "Order submission from order-gateway ceased — no new orders in last 3s"
      },
      {
        "timestamp": "2024-07-22T09:38:00.000Z",
        "level": "INFO",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-rl-5540",
        "message": "ALGO-412 IP blocked pending remediation — rate limiter connection amplification protection enabled"
      },
      {
        "timestamp": "2024-07-22T09:38:30.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-rl-5540",
        "message": "Connection pool recovering — legitimate client traffic normalising"
      }
    ]
  },
  {
    "id": "LOG-014",
    "name": "Risk Limit Breach Rejection Storm",
    "title": "Risk limit breach rejection storm — desk-level position limit exceeded",
    "description": "A high-frequency algo desk exceeded its intraday position limit for US equity options. risk-engine began rejecting all new orders from the desk. 1,200 orders were rejected in 4 minutes, causing the desk to contact the operations team.",
    "severity": "HIGH",
    "affectedServices": [
      "risk-engine",
      "order-gateway",
      "position-service",
      "compliance-engine"
    ],
    "logs": [
      {
        "timestamp": "2024-08-14T11:00:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "Desk DESK-USO position limit approaching: 87% utilised (87,000 / 100,000 contracts)"
      },
      {
        "timestamp": "2024-08-14T11:01:00.000Z",
        "level": "WARN",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "Desk DESK-USO position limit: 97% utilised — issuing pre-breach warning to compliance-engine"
      },
      {
        "timestamp": "2024-08-14T11:02:00.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "RISK LIMIT BREACH: DESK-USO net position 101,400 contracts exceeds limit 100,000 — rejecting all new orders"
      },
      {
        "timestamp": "2024-08-14T11:02:01.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-risk-6620",
        "message": "Order DESK-USO rejected by risk-engine: position limit exceeded — rejection count: 1"
      },
      {
        "timestamp": "2024-08-14T11:02:30.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-risk-6620",
        "message": "Order rejection count for DESK-USO: 340 in 30 seconds — desk still submitting orders"
      },
      {
        "timestamp": "2024-08-14T11:04:00.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-risk-6620",
        "message": "Total order rejections for DESK-USO: 1,200 — desk operations team notified"
      },
      {
        "timestamp": "2024-08-14T11:04:05.000Z",
        "level": "WARN",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-risk-6620",
        "message": "Limit breach event logged to audit trail — regulatory notification prepared"
      },
      {
        "timestamp": "2024-08-14T11:22:00.000Z",
        "level": "INFO",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-risk-6620",
        "message": "DESK-USO limit updated to 140,000 contracts — new orders accepted, position: 101,400"
      }
    ]
  },
  {
    "id": "LOG-015",
    "name": "FIX Protocol Session Drop",
    "title": "FIX protocol session drop — market maker connectivity lost",
    "description": "fix-gateway dropped FIX session with primary market maker after a heartbeat timeout. The market maker's quotes were withdrawn from the order book. Spread widened significantly for 18 minutes before the session was re-established.",
    "severity": "HIGH",
    "affectedServices": [
      "fix-gateway",
      "order-gateway",
      "matching-engine"
    ],
    "logs": [
      {
        "timestamp": "2024-09-03T10:00:00.000Z",
        "level": "INFO",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX session established with MM-BARCLAYS: SenderCompID=TRIAGEX, TargetCompID=BARCFX, SeqNum=1"
      },
      {
        "timestamp": "2024-09-03T10:01:00.000Z",
        "level": "WARN",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX heartbeat timeout: no Heartbeat(0) received from MM-BARCLAYS in 30s — sending TestRequest"
      },
      {
        "timestamp": "2024-09-03T10:01:10.000Z",
        "level": "WARN",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "No response to TestRequest after 10s — FIX session considered DROPPED for MM-BARCLAYS"
      },
      {
        "timestamp": "2024-09-03T10:01:12.000Z",
        "level": "ERROR",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX session disconnected: TCP connection reset by network device — idle timeout detected"
      },
      {
        "timestamp": "2024-09-03T10:01:14.000Z",
        "level": "ERROR",
        "service": "matching-engine",
        "instance": "me-01",
        "traceId": "trc-fix-4410",
        "message": "MM-BARCLAYS quotes withdrawn from order book — spread widening on EUR/USD, GBP/USD, USD/JPY"
      },
      {
        "timestamp": "2024-09-03T10:01:15.000Z",
        "level": "WARN",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-fix-4410",
        "message": "No best bid/offer for EUR/USD — client orders resting at limit, no execution"
      },
      {
        "timestamp": "2024-09-03T10:18:30.000Z",
        "level": "INFO",
        "service": "fix-gateway",
        "instance": "fg-01",
        "traceId": "trc-fix-4410",
        "message": "FIX session re-established with MM-BARCLAYS — TCP keepalive enabled (30s interval)"
      },
      {
        "timestamp": "2024-09-03T10:18:45.000Z",
        "level": "INFO",
        "service": "matching-engine",
        "instance": "me-01",
        "traceId": "trc-fix-4410",
        "message": "MM-BARCLAYS quotes restored — normal spread resumed on all FX pairs"
      }
    ]
  },
  {
    "id": "LOG-016",
    "name": "Margin Call Processing Failure",
    "title": "Margin call processing failure — batch job timeout",
    "description": "End-of-day margin call processing job timed out after 4 hours, exceeding its 3-hour SLA. 847 accounts did not receive margin calls. Risk team had to manually trigger margin calls and notify clients.",
    "severity": "CRITICAL",
    "affectedServices": [
      "margin-service",
      "position-service",
      "risk-engine",
      "notification-service"
    ],
    "logs": [
      {
        "timestamp": "2024-10-15T17:00:00.000Z",
        "level": "INFO",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "End-of-day margin call batch started — 847 accounts, 12 stress scenarios each"
      },
      {
        "timestamp": "2024-10-15T18:00:00.000Z",
        "level": "INFO",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Margin batch progress: 182/847 accounts (21%) — elapsed: 60 min, estimated remaining: 240 min"
      },
      {
        "timestamp": "2024-10-15T19:00:00.000Z",
        "level": "WARN",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Margin batch progress: 310/847 accounts (37%) — exceeding 3-hour SLA projected"
      },
      {
        "timestamp": "2024-10-15T20:00:00.000Z",
        "level": "ERROR",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Margin call batch TIMEOUT after 3 hours — 537/847 accounts processed, 310 accounts incomplete"
      },
      {
        "timestamp": "2024-10-15T20:00:02.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-margin-3301",
        "message": "Margin batch did not complete — 310 accounts have no margin call for today's session"
      },
      {
        "timestamp": "2024-10-15T20:00:05.000Z",
        "level": "WARN",
        "service": "notification-service",
        "instance": "ns-01",
        "traceId": "trc-margin-3301",
        "message": "310 margin call notifications suppressed — batch incomplete flag set"
      },
      {
        "timestamp": "2024-10-15T20:10:00.000Z",
        "level": "WARN",
        "service": "position-service",
        "instance": "ps-01",
        "traceId": "trc-margin-3301",
        "message": "Risk team escalated: 310 accounts require manual margin call generation"
      },
      {
        "timestamp": "2024-10-16T09:00:00.000Z",
        "level": "INFO",
        "service": "margin-service",
        "instance": "ms-01",
        "traceId": "trc-margin-3301",
        "message": "Parallelised scenario generation deployed — 847 accounts processed in 87 minutes"
      }
    ],
    "alerts": [
      {
        "alertName": "MarginCallBatchTimeout",
        "severity": "CRITICAL",
        "service": "margin-service",
        "firedAt": "2024-09-30T18:00:00.000Z",
        "description": "End-of-day margin call batch exceeded 3h SLA",
        "value": "240min",
        "threshold": "180min"
      },
      {
        "alertName": "PositionServiceTimeout",
        "severity": "HIGH",
        "service": "position-service",
        "firedAt": "2024-09-30T18:00:30.000Z",
        "description": "Position lookups timing out during margin calculation"
      }
    ]
  },
  {
    "id": "LOG-017",
    "name": "Compliance Rule Engine Timeout",
    "title": "Compliance rule engine timeout — pre-trade check SLA breach",
    "description": "compliance-engine pre-trade checks began timing out (>500 ms) for orders involving sanctions-screened counterparties. 3,400 orders were delayed beyond the 200 ms SLA. Two orders were auto-rejected due to timeout fallback policy.",
    "severity": "HIGH",
    "affectedServices": [
      "compliance-engine",
      "order-gateway",
      "audit-service"
    ],
    "logs": [
      {
        "timestamp": "2024-11-05T08:00:00.000Z",
        "level": "INFO",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Sanctions list updated: 4,200 new entries added — total: 89,421 entries"
      },
      {
        "timestamp": "2024-11-05T08:01:00.000Z",
        "level": "WARN",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Pre-trade check latency elevated: p50=180ms, p99=620ms (limit: 200ms) — possible index issue"
      },
      {
        "timestamp": "2024-11-05T08:05:00.000Z",
        "level": "ERROR",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Pre-trade sanctions check timeout: 520ms for counterparty BARC-UK-4421 — timeout limit 200ms"
      },
      {
        "timestamp": "2024-11-05T08:05:02.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-comply-7730",
        "message": "Order delayed: compliance pre-trade check exceeded 200ms SLA — 3,400 orders pending"
      },
      {
        "timestamp": "2024-11-05T08:05:05.000Z",
        "level": "ERROR",
        "service": "compliance-engine",
        "instance": "ce-02",
        "traceId": "trc-comply-7730",
        "message": "Fallback policy triggered: 2 orders auto-rejected due to timeout — audit record created"
      },
      {
        "timestamp": "2024-11-05T08:05:08.000Z",
        "level": "WARN",
        "service": "audit-service",
        "instance": "as-01",
        "traceId": "trc-comply-7730",
        "message": "Compliance timeout event logged — regulatory reporting required for auto-rejected orders"
      },
      {
        "timestamp": "2024-11-05T09:20:00.000Z",
        "level": "INFO",
        "service": "compliance-engine",
        "instance": "ce-01",
        "traceId": "trc-comply-7730",
        "message": "Trigram index created on sanctions_list(counterparty_name) — check latency: 12ms"
      },
      {
        "timestamp": "2024-11-05T09:21:00.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-comply-7730",
        "message": "Pre-trade compliance checks restored to normal latency — 3,400 queued orders processing"
      }
    ]
  },
  {
    "id": "LOG-018",
    "name": "Bad Config Push Causing Startup Failures",
    "title": "Bad config push — config-service pushed null environment variables",
    "description": "A config-service deployment pushed a YAML file with null values for 12 critical environment variables. Dependent services (order-gateway, risk-engine) read empty strings and failed to connect to their dependencies.",
    "severity": "CRITICAL",
    "affectedServices": [
      "config-service",
      "order-gateway",
      "risk-engine",
      "trade-executor"
    ],
    "logs": [
      {
        "timestamp": "2024-12-02T10:00:00.000Z",
        "level": "INFO",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Config deployment started — version: v2.4.1, target: production, services: 12"
      },
      {
        "timestamp": "2024-12-02T10:00:05.000Z",
        "level": "WARN",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Config push complete — YAML merge applied for 12 services"
      },
      {
        "timestamp": "2024-12-02T10:00:10.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-cfg-2210",
        "message": "Startup failed: KAFKA_BROKER_URL is null — cannot establish producer connection"
      },
      {
        "timestamp": "2024-12-02T10:00:11.000Z",
        "level": "ERROR",
        "service": "risk-engine",
        "instance": "re-01",
        "traceId": "trc-cfg-2210",
        "message": "Startup failed: POSTGRES_HOST is null — database connection string invalid"
      },
      {
        "timestamp": "2024-12-02T10:00:12.000Z",
        "level": "ERROR",
        "service": "trade-executor",
        "instance": "te-01",
        "traceId": "trc-cfg-2210",
        "message": "Startup failed: REDIS_SENTINEL_URL is null — session store connection failed"
      },
      {
        "timestamp": "2024-12-02T10:00:13.000Z",
        "level": "ERROR",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-cfg-2210",
        "message": "Downstream service health checks failing: order-gateway, risk-engine, trade-executor — returning 503"
      },
      {
        "timestamp": "2024-12-02T10:00:15.000Z",
        "level": "WARN",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Rollback initiated — reverting to config version v2.4.0"
      },
      {
        "timestamp": "2024-12-02T10:00:30.000Z",
        "level": "INFO",
        "service": "config-service",
        "instance": "cs-01",
        "traceId": "trc-cfg-2210",
        "message": "Config rollback complete — v2.4.0 deployed to all services"
      },
      {
        "timestamp": "2024-12-02T10:00:45.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-cfg-2210",
        "message": "Service started successfully with v2.4.0 config — all connections established"
      }
    ]
  },
  {
    "id": "LOG-019",
    "name": "Rolling Deployment Causing Version Mismatch",
    "title": "Rolling deployment version mismatch — API contract breaking change",
    "description": "A rolling deployment of trade-executor introduced a breaking change in the internal trade submission API. Old pods (v1.8) and new pods (v1.9) ran simultaneously for 12 minutes. Calls routed to old pods failed when downstream services sent v1.9 payloads.",
    "severity": "HIGH",
    "affectedServices": [
      "trade-executor",
      "order-gateway",
      "settlement-service"
    ],
    "logs": [
      {
        "timestamp": "2024-09-18T14:00:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Rolling deployment started: trade-executor v1.8 -> v1.9 (3 pods, 1 at a time)"
      },
      {
        "timestamp": "2024-09-18T14:01:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Pod te-03 updated to v1.9 and healthy — 1/3 pods on v1.9, 2/3 on v1.8"
      },
      {
        "timestamp": "2024-09-18T14:01:05.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-deploy-8810",
        "message": "Response deserialization error from trade-executor te-01 (v1.8): missing field 'settlementType' — 500 Internal Server Error"
      },
      {
        "timestamp": "2024-09-18T14:01:06.000Z",
        "level": "ERROR",
        "service": "order-gateway",
        "instance": "og-02",
        "traceId": "trc-deploy-8810",
        "message": "Response deserialization error from trade-executor te-02 (v1.8): unexpected null on 'clearingCode'"
      },
      {
        "timestamp": "2024-09-18T14:01:10.000Z",
        "level": "WARN",
        "service": "api-gateway",
        "instance": "apigw-01",
        "traceId": "trc-deploy-8810",
        "message": "Error rate spike: 67% of /submit-trade requests returning 500 — version mismatch suspected"
      },
      {
        "timestamp": "2024-09-18T14:01:12.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-deploy-8810",
        "message": "Cannot parse trade response from te-01 (v1.8) — settlement for 340 trades cannot proceed"
      },
      {
        "timestamp": "2024-09-18T14:12:00.000Z",
        "level": "WARN",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Deployment paused — version mismatch detected, initiating rollback to v1.8"
      },
      {
        "timestamp": "2024-09-18T14:13:00.000Z",
        "level": "INFO",
        "service": "trade-executor",
        "instance": "te-03",
        "traceId": "trc-deploy-8810",
        "message": "Rollback complete — all 3 pods on v1.8, API compatibility restored"
      },
      {
        "timestamp": "2024-09-18T14:13:15.000Z",
        "level": "INFO",
        "service": "order-gateway",
        "instance": "og-01",
        "traceId": "trc-deploy-8810",
        "message": "trade-executor responses parsing correctly — error rate returned to 0%"
      }
    ]
  },
  {
    "id": "LOG-020",
    "name": "Settlement Batch Processing Failure",
    "title": "Settlement batch failure — clearing-service file format rejection",
    "description": "End-of-day settlement batch generated clearing files in SWIFT MT940 format but clearing-service expected ISO 20022 XML. All 1,847 settlement records were rejected. Overnight settlement was at risk.",
    "severity": "CRITICAL",
    "affectedServices": [
      "settlement-service",
      "clearing-service",
      "reporting-service"
    ],
    "logs": [
      {
        "timestamp": "2024-11-28T17:00:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "End-of-day settlement batch started — 1,847 records, format: SWIFT MT940, target: clearing-service"
      },
      {
        "timestamp": "2024-11-28T17:05:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement file generated: settlement_20241128.mt940 (1,847 records, 4.2 MB)"
      },
      {
        "timestamp": "2024-11-28T17:05:10.000Z",
        "level": "ERROR",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-settle-9920",
        "message": "File parse error: expected ISO 20022 XML (pain.013.001.07), received SWIFT MT940 — rejecting batch"
      },
      {
        "timestamp": "2024-11-28T17:05:11.000Z",
        "level": "ERROR",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement batch REJECTED: 1,847/1,847 records failed format validation — no records processed"
      },
      {
        "timestamp": "2024-11-28T17:05:12.000Z",
        "level": "ERROR",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "Clearing rejection received for full batch — overnight settlement for 1,847 trades at risk"
      },
      {
        "timestamp": "2024-11-28T17:05:15.000Z",
        "level": "WARN",
        "service": "reporting-service",
        "instance": "rs-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement completion report cannot be generated — batch not acknowledged by clearing"
      },
      {
        "timestamp": "2024-11-28T17:05:20.000Z",
        "level": "WARN",
        "service": "audit-service",
        "instance": "as-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement failure logged — regulatory reporting required, 1,847 trades unsettled"
      },
      {
        "timestamp": "2024-11-28T18:30:00.000Z",
        "level": "INFO",
        "service": "settlement-service",
        "instance": "ss-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement file regenerated in SWIFT MT940 format (format reverted) — resubmitting to clearing"
      },
      {
        "timestamp": "2024-11-28T18:35:00.000Z",
        "level": "INFO",
        "service": "clearing-service",
        "instance": "cl-01",
        "traceId": "trc-settle-9920",
        "message": "Settlement batch accepted — 1,847 records validated and queued for overnight processing"
      }
    ],
    "alerts": [
      {
        "alertName": "SettlementBatchRejected",
        "severity": "CRITICAL",
        "service": "settlement-service",
        "firedAt": "2024-11-15T22:00:00.000Z",
        "description": "All 1847 settlement records rejected by clearing-service",
        "value": "1847",
        "threshold": "0"
      },
      {
        "alertName": "ClearingFileFormatError",
        "severity": "CRITICAL",
        "service": "clearing-service",
        "firedAt": "2024-11-15T22:00:05.000Z",
        "description": "Expected ISO 20022 XML but received SWIFT MT940 format"
      }
    ]
  }
];
