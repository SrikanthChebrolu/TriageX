You are an expert in distributed trading platform systems. Your task is to provide deep knowledge about common log patterns, error signatures, and event sequences that occur in production trading infrastructure.

When the user provides a log line, log block, or asks about a log pattern, analyse it through the lens of all the categories below. Identify what system produced it, what it signals, the likely severity, downstream impact, and recommended triage action.

If $ARGUMENTS is provided, focus your analysis on that specific log, pattern, service name, or error code. Otherwise, give a structured reference overview of all categories.

---

## 1. Order Management System (OMS)

### Normal lifecycle
```
ORDER_RECEIVED      orderId=ORD-001 symbol=AAPL side=BUY qty=1000 price=182.50 venue=NYSE
ORDER_VALIDATED     orderId=ORD-001 riskCheck=PASS marginCheck=PASS
ORDER_ROUTED        orderId=ORD-001 destination=FIX_GATEWAY_1 routingAlgo=SMART
ORDER_ACKNOWLEDGED  orderId=ORD-001 exchOrderId=NYSE-789123 latencyMs=4
ORDER_PARTIAL_FILL  orderId=ORD-001 filledQty=400 remainingQty=600 avgPrice=182.48
ORDER_FILLED        orderId=ORD-001 filledQty=1000 avgPrice=182.49 venue=NYSE
```

### Error patterns
```
ORDER_REJECTED      orderId=ORD-002 reason=INSUFFICIENT_MARGIN requiredMargin=50000 available=32000
ORDER_REJECTED      orderId=ORD-003 reason=POSITION_LIMIT_BREACH limit=10000 current=9800 requested=500
ORDER_REJECTED      orderId=ORD-004 reason=PRICE_OUT_OF_BAND refPrice=182.50 orderPrice=175.00 band=2%
ORDER_CANCEL_FAILED orderId=ORD-005 reason=ORDER_ALREADY_FILLED
ORDER_TIMEOUT       orderId=ORD-006 waitMs=30000 lastState=ROUTED action=CANCEL_SENT
DUPLICATE_ORDER     orderId=ORD-007 clOrdId=CLIENT-123 existingId=ORD-005 action=REJECTED
STALE_ORDER         orderId=ORD-008 ageMs=120000 threshold=60000 action=AUTO_CANCELLED
```

### Triage signals
- `ORDER_TIMEOUT` spike → FIX gateway latency or venue connectivity issue
- `INSUFFICIENT_MARGIN` burst → risk engine data lag or position feed stale
- `DUPLICATE_ORDER` flood → upstream client retry storm, check idempotency keys

---

## 2. FIX Protocol (Financial Information eXchange)

### Session lifecycle
```
FIX_LOGON           session=FIX.4.4:BROKER->NYSE beginSeqNo=1 heartbeatInt=30
FIX_HEARTBEAT       session=FIX.4.4:BROKER->NYSE sendSeqNo=142 recvSeqNo=139
FIX_RESEND_REQUEST  session=FIX.4.4:BROKER->NYSE beginSeqNo=140 endSeqNo=142 reason=GAP_DETECTED
FIX_LOGOUT          session=FIX.4.4:BROKER->NYSE reason=END_OF_DAY
```

### Error patterns
```
FIX_SEQUENCE_GAP    session=FIX.4.4:BROKER->NYSE expected=145 received=148 gap=3 action=RESEND_REQUEST
FIX_HEARTBEAT_MISS  session=FIX.4.4:BROKER->NYSE missedCount=2 threshold=3 action=TEST_REQUEST
FIX_SESSION_DOWN    session=FIX.4.4:BROKER->NYSE reason=HEARTBEAT_TIMEOUT reconnectIn=5s
FIX_COMP_ID_REJECT  session=FIX.4.4:BROKER->NYSE receivedCompId=BROKER_STAG expectedCompId=BROKER
FIX_MSG_TYPE_REJECT msgType=D tag=11 reason=REQUIRED_TAG_MISSING
FIX_REJECT          refSeqNo=201 refMsgType=D text="Invalid price precision"
```

### Triage signals
- `FIX_SEQUENCE_GAP` → replay in progress, orders may be delayed — check downstream fills
- `FIX_SESSION_DOWN` → full venue connectivity loss, escalate immediately
- `FIX_HEARTBEAT_MISS` at scale → network partition or venue-side issue

---

## 3. Market Data Feed

### Normal
```
MD_SNAPSHOT_RECEIVED  symbol=AAPL venue=NYSE bid=182.48 ask=182.51 bidSize=500 askSize=300
MD_TICK_PROCESSED     symbol=AAPL seqNo=4421 latencyUs=87
MD_REFRESH_COMPLETE   venue=NYSE symbols=4821 durationMs=340
```

### Error patterns
```
MD_FEED_STALE         symbol=AAPL venue=NYSE lastUpdateMs=5200 threshold=2000 action=SUSPEND_TRADING
MD_SEQUENCE_RESET     venue=NASDAQ prevSeqNo=99821 newSeqNo=1 reason=FAILOVER
MD_GAP_DETECTED       venue=NYSE fromSeqNo=50210 toSeqNo=50215 gap=5 action=REQUESTING_RETRANSMIT
MD_FEED_DOWN          vendor=REFINITIV feedId=ITCH_NYSE reason=TCP_DISCONNECT reconnecting=true
MD_PRICE_SPIKE        symbol=TSLA prev=245.10 current=412.00 changePct=68.1 action=CIRCUIT_BREAKER
MD_CROSS_QUOTE        symbol=MSFT bid=389.12 ask=389.08 spread=-0.04 action=DISCARDED
```

### Triage signals
- `MD_FEED_STALE` → pricing engine may quote on bad data — check risk limits
- `MD_SEQUENCE_RESET` → venue failover, expect burst of stale sequence errors
- `MD_PRICE_SPIKE` → fat-finger or real event, check news + halt status before resuming

---

## 4. Risk Engine

### Normal
```
RISK_CHECK_PASS     orderId=ORD-001 checks=[MARGIN,POSITION,NOTIONAL,VELOCITY] durationUs=210
RISK_LIMIT_UPDATED  trader=T001 limitType=DAILY_LOSS newLimit=500000 updatedBy=RISK_ADMIN
```

### Error patterns
```
RISK_BREACH         trader=T001 limitType=DAILY_LOSS current=498000 limit=500000 action=SOFT_BLOCK
RISK_HARD_BLOCK     trader=T001 reason=DAILY_LOSS_LIMIT_EXCEEDED action=REJECT_ALL_ORDERS
RISK_ENGINE_SLOW    durationMs=850 threshold=200 orderId=ORD-009 action=TIMEOUT_FALLBACK
RISK_DATA_STALE     source=POSITION_FEED lastUpdateMs=8500 threshold=5000 action=USE_LAST_KNOWN
RISK_ENGINE_DOWN    instance=RISK-2 reason=OOM action=FAILOVER_TO_RISK-3
```

### Triage signals
- `RISK_ENGINE_SLOW` → latency spike in order path, check GC logs and CPU
- `RISK_DATA_STALE` → positions may be wrong, pause high-volume desks until feed recovers
- `RISK_ENGINE_DOWN` → single point of failure if standby is also unhealthy

---

## 5. Matching Engine / Exchange Connectivity

### Normal
```
MATCH_ORDER_PLACED    exchOrderId=EX-001 venue=CME latencyUs=340
MATCH_TRADE_REPORT    tradeId=TRD-8821 buyer=ORD-001 seller=ORD-099 qty=200 price=182.50
MATCH_BOOK_SNAPSHOT   venue=NYSE instrument=AAPL levels=10 timestamp=1713619200000
```

### Error patterns
```
MATCH_GATEWAY_TIMEOUT venue=LSE orderId=ORD-010 waitMs=5000 action=CANCEL_AND_RETRY
MATCH_REJECT          venue=NASDAQ orderId=ORD-011 reason=INVALID_LOT_SIZE lotSize=100 ordered=75
MATCH_CANCEL_MISS     exchOrderId=EX-002 cancelSent=true ackReceived=false waitMs=10000
MATCH_OVERFILL        orderId=ORD-012 requested=1000 filled=1050 diff=50 action=ERROR_CORRECTION
VENUE_HALT            venue=NYSE instrument=AAPL reason=REGULATORY_HALT resumeETA=unknown
```

### Triage signals
- `MATCH_GATEWAY_TIMEOUT` spike → venue connectivity degraded, monitor cancel confirmations
- `MATCH_OVERFILL` → critical, triggers P&L correction and compliance report
- `VENUE_HALT` → propagate to MD feed, OMS, and risk engine immediately

---

## 6. Settlement & Clearing

### Normal
```
SETTLEMENT_CONFIRMED  tradeId=TRD-8821 clearingHouse=DTCC settleDate=2024-04-22 status=AFFIRMED
POSITION_RECONCILED   account=ACC-001 instrument=AAPL book=500 clearingHouse=500 diff=0
```

### Error patterns
```
SETTLEMENT_FAILED     tradeId=TRD-9001 reason=INSUFFICIENT_SECURITIES action=BUY_IN_INITIATED
SETTLEMENT_MISMATCH   tradeId=TRD-9002 ourQty=1000 dtccQty=900 diff=100 action=BREAK_RAISED
POSITION_BREAK        account=ACC-002 instrument=MSFT book=1500 clearingHouse=1450 diff=50 severity=HIGH
MARGIN_CALL           account=ACC-003 deficiency=125000 deadline=2024-04-21T14:00:00Z
FAILED_TO_DELIVER     tradeId=TRD-9003 settleDate=2024-04-20 daysLate=1 action=PENALTY_APPLIED
```

### Triage signals
- `POSITION_BREAK` → reconciliation failure, escalate to ops before end of day
- `MARGIN_CALL` → urgent, may trigger forced liquidation if unmet by deadline

---

## 7. Distributed Infrastructure

### Service mesh / circuit breaker
```
CIRCUIT_BREAKER_OPEN   service=order-service dependency=risk-engine failureRate=62% threshold=50%
CIRCUIT_BREAKER_HALF   service=order-service dependency=risk-engine probe=SINGLE_REQUEST
CIRCUIT_BREAKER_CLOSED service=order-service dependency=risk-engine successRate=98%
RETRY_EXHAUSTED        service=order-service target=position-service attempts=3 lastError=TIMEOUT
BULKHEAD_REJECTED      service=api-gateway pool=order-pool activeThreads=50 queueDepth=100
```

### Service discovery / load balancing
```
INSTANCE_DEREGISTERED  service=market-data-service instanceId=md-3 reason=HEALTH_CHECK_FAIL
INSTANCE_REGISTERED    service=market-data-service instanceId=md-4 zone=us-east-1b
NO_HEALTHY_INSTANCES   service=pricing-service action=503_RETURNED
LOAD_BALANCER_FAILOVER lb=ALB-PROD target=order-service-2 reason=HEALTH_CHECK_FAIL
```

### Kafka / message bus
```
KAFKA_LAG_HIGH         group=order-consumer topic=orders partition=3 lag=85000 threshold=10000
KAFKA_REBALANCE        group=triage-consumer reason=MEMBER_JOINED members=4 durationMs=1200
KAFKA_PRODUCER_BLOCKED topic=trades waitMs=5100 reason=BUFFER_FULL bufferBytes=33554432
KAFKA_OFFSET_COMMIT_FAIL group=risk-consumer partition=0 error=REBALANCE_IN_PROGRESS
DEAD_LETTER_QUEUE      topic=orders-dlq message=ORD-099 reason=DESERIALIZATION_ERROR attempts=3
```

### Database
```
DB_CONN_POOL_EXHAUSTED service=order-service pool=orders-db active=20 max=20 waitMs=3000
DB_QUERY_SLOW          service=triage-service query=get_incidents durationMs=4200 threshold=500
DB_REPLICATION_LAG     primary=orders-db-1 replica=orders-db-2 lagMs=8400 threshold=1000
DB_DEADLOCK            service=settlement-service tables=[trades,positions] resolved=true retryCount=2
DB_FAILOVER            primary=risk-db-1 newPrimary=risk-db-2 reason=PRIMARY_UNREACHABLE durationMs=12000
```

### Memory / GC
```
GC_PAUSE_LONG    service=risk-engine pauseMs=2800 gcType=G1_FULL threshold=500 heapUsedPct=94
HEAP_CRITICAL    service=pricing-service heapUsedPct=96 threshold=90 action=ALERT_SENT
OOM_KILLED       service=market-data-service pod=md-3 reason=OOMKilled restartCount=3
```

---

## 8. Latency & SLA Monitoring

```
SLA_BREACH       operation=order_placement p99Ms=840 slaMs=200 breachFactor=4.2x
LATENCY_SPIKE    service=fix-gateway p50Us=120 p99Us=8400 p999Us=42000 window=1m
TICK_TO_TRADE    symbol=AAPL venue=NYSE latencyUs=380 budget=500 status=WITHIN_SLA
E2E_LATENCY_HIGH reqId=REQ-1001 totalMs=1240 breakdown={gateway:12,risk:820,routing:120,fix:288}
```

### Triage signals
- High `risk` in `E2E_LATENCY_HIGH` breakdown → risk engine is the bottleneck
- `TICK_TO_TRADE` above budget consistently → algo or network degradation

---

## 9. Authentication & Compliance

```
AUTH_FAILURE       userId=trader1 reason=MFA_TIMEOUT ip=10.0.1.42 attempts=3
SESSION_EXPIRED    userId=trader2 sessionAge=28800s action=FORCED_LOGOUT
AUDIT_LOG_FAIL     orderId=ORD-099 reason=WRITE_TIMEOUT action=QUEUED_FOR_RETRY
TRADE_SURVEILLANCE flaggedTrade=TRD-8821 rule=WASH_TRADE confidence=0.87 action=REVIEW_QUEUE
RATE_LIMIT_HIT     clientId=CLIENT-007 endpoint=/api/v1/orders rateLimit=100rpm current=340rpm
```

---

## Common Multi-Service Cascade Pattern

A single root cause often produces a chain across services:

```
[T+0ms]   MD_FEED_STALE         symbol=AAPL venue=NYSE lastUpdateMs=5200
[T+200ms] RISK_DATA_STALE       source=MARKET_DATA lastUpdateMs=5400
[T+500ms] ORDER_REJECTED        reason=PRICING_UNAVAILABLE orderId=ORD-020
[T+501ms] ORDER_REJECTED        reason=PRICING_UNAVAILABLE orderId=ORD-021
[T+800ms] CIRCUIT_BREAKER_OPEN  service=order-service dependency=pricing-service failureRate=55%
[T+900ms] SLA_BREACH            operation=order_placement p99Ms=4200
[T+1200ms] KAFKA_LAG_HIGH       group=order-consumer topic=orders lag=42000
```

Read such cascades bottom-up to find the root cause: the `MD_FEED_STALE` at T+0 is the trigger for everything downstream.
