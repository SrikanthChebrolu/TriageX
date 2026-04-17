# Requirement 03 — Root Cause Suggestion

## Overview

Build a REST endpoint that accepts three signal sources — **log entries**, **active alerts**,
and an **incident description** — and returns a ranked list of probable root causes.

Each root cause is scored with a **confidence score** (0–100) computed by correlating
all three signals against each other and against the `KnowledgeStore` of historical
incidents. The confidence score tells the support engineer how likely the proposed root
cause is, backed by concrete evidence from logs, alerts, and past occurrences.

No LLM call is made today. The `MockRootCauseLLMProvider` produces deterministic output
from signal correlation and pattern matching. The system is wired so a real LLM
can replace it at a single point with zero structural changes.

---

## Endpoint

```
POST /api/v1/incidents/root-cause
Content-Type: application/json
```

---

## Request Schema

```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T14:32:01.123Z",
      "level":     "ERROR",
      "service":   "order-gateway",
      "message":   "Connection timeout to matching-engine after 5000ms",
      "traceId":   "abc-123"
    }
  ],
  "alerts": [
    {
      "service":   "market-data-feed",
      "metric":    "feed_latency_ms",
      "threshold": 1000,
      "current":   5400,
      "severity":  "CRITICAL"
    }
  ],
  "incident": {
    "title":            "Spike in order rejections for corporate bonds",
    "description":      "40% of orders rejected with stale price error since 14:30 UTC.",
    "affectedServices": ["order-gateway", "matching-engine", "market-data-feed"],
    "severity":         "HIGH"
  }
}
```

**Validation rules:**
- `logs` — required array, min 1 entry, same schema as Req 01.
- `alerts` — required array (can be empty `[]`). Each alert needs `service`, `metric`,
  `threshold` (number), `current` (number), `severity` (LOW/MEDIUM/HIGH/CRITICAL).
- `incident` — required object, same schema as Req 02.

---

## Response Schema

```json
{
  "data": {
    "analyzedAt": "2024-01-15T14:33:00.000Z",
    "rootCauses": [
      {
        "rank":            1,
        "rootCause":       "market-data-feed upstream connectivity degradation causing stale prices",
        "confidenceScore": 88,
        "confidenceBand":  "HIGH",
        "scoreBreakdown": {
          "logCorrelationScore":     28,
          "alertCorrelationScore":   25,
          "incidentSimilarityScore": 22,
          "signalConvergenceBonus":  13,
          "total":                   88
        },
        "supportingEvidence": {
          "logs": [
            {
              "service": "order-gateway",
              "message": "Connection timeout to matching-engine after 5000ms",
              "level":   "ERROR",
              "relevance": "Timeout on downstream call consistent with stale-price cascade"
            }
          ],
          "alerts": [
            {
              "service":   "market-data-feed",
              "metric":    "feed_latency_ms",
              "threshold": 1000,
              "current":   5400,
              "relevance": "Feed latency 5.4× over threshold — primary signal for stale prices"
            }
          ],
          "historicalIncidents": [
            {
              "id":              "INC-004",
              "title":           "Market data feed latency spike",
              "similarityScore": 0.91,
              "rootCause":       "Upstream feed provider connectivity degradation",
              "resolution":      "Switched to backup feed; primary restored after 18 min",
              "resolvedInMin":   18,
              "relevance":       "Identical alert pattern (feed_latency_ms) and same cascade path"
            }
          ]
        },
        "nextSteps": [
          {
            "step":      1,
            "action":    "Confirm feed provider status page for upstream degradation",
            "owner":     "NOC",
            "urgency":   "IMMEDIATE"
          },
          {
            "step":      2,
            "action":    "Switch market-data-feed to backup provider if primary latency > 2000ms",
            "owner":     "Ops",
            "urgency":   "IMMEDIATE"
          },
          {
            "step":      3,
            "action":    "Monitor order rejection rate after feed switch — expect recovery within 2 min",
            "owner":     "Support",
            "urgency":   "MONITOR"
          }
        ]
      }
    ],
    "signalSummary": {
      "logsAnalyzed":    12,
      "alertsAnalyzed":  3,
      "historicalMatches": 2
    },
    "summary": "Root cause identified with HIGH confidence (88/100): market-data-feed upstream connectivity degradation. Supported by feed_latency_ms alert (5400ms vs 1000ms threshold) and 2 historical incidents with identical patterns. Recommended action: switch to backup feed immediately."
  },
  "error": null,
  "meta": { "processingMs": 54 }
}
```

---

## Confidence Score Algorithm

Each root cause candidate is scored on **four signals** (max 100):

| Signal | Max pts | How computed |
|---|---|---|
| Log correlation | 30 | How many error-level log messages match the root cause pattern (keyword overlap) |
| Alert correlation | 30 | Alert breach ratio × severity weight — how far over threshold, how severe |
| Historical incident similarity | 25 | Top cosine similarity score from KnowledgeStore × 25 |
| Signal convergence bonus | 15 | Awarded when ≥ 2 of the 3 signal sources independently point to the same root cause |

**Confidence bands:**

| Score | Band | Meaning |
|---|---|---|
| 75–100 | HIGH | Strong multi-signal evidence — act on this root cause |
| 50–74  | MEDIUM | Likely cause — investigate alongside HIGH candidates |
| 25–49  | LOW | Weak signal — worth noting but do not act without more evidence |
| 0–24   | SPECULATIVE | Pattern hint only — treat as hypothesis |

```js
// services/rootCause/confidenceScorer.js

const ALERT_SEVERITY_WEIGHTS = { CRITICAL: 1.0, HIGH: 0.8, MEDIUM: 0.5, LOW: 0.2 };

/**
 * Computes the confidence score for a single root cause candidate.
 *
 * Each of the four signals is scored independently so they are
 * individually testable and the breakdown is fully transparent.
 */
function computeConfidenceScore({ logScore, alertScore, historicalScore, signalCount }) {
  const logCorrelationScore     = Math.min(Math.round(logScore * 30), 30);
  const alertCorrelationScore   = Math.min(Math.round(alertScore * 30), 30);
  const incidentSimilarityScore = Math.min(Math.round(historicalScore * 25), 25);

  // Convergence bonus: awarded when 2+ independent signal sources agree
  const signalConvergenceBonus = signalCount >= 2 ? 15 : 0;

  const total = logCorrelationScore
    + alertCorrelationScore
    + incidentSimilarityScore
    + signalConvergenceBonus;

  return {
    logCorrelationScore,
    alertCorrelationScore,
    incidentSimilarityScore,
    signalConvergenceBonus,
    total: Math.min(total, 100),
  };
}

/**
 * Scores how strongly an alert breach supports a root cause.
 *
 * Formula: breach ratio (current/threshold) clamped to 1.0, × severity weight.
 * A metric at 5× its threshold with CRITICAL severity → score near 1.0.
 */
function scoreAlert(alert) {
  const breachRatio     = Math.min(alert.current / alert.threshold, 5) / 5; // normalise 0–1
  const severityWeight  = ALERT_SEVERITY_WEIGHTS[alert.severity] ?? 0.2;
  return breachRatio * severityWeight;
}

/**
 * Scores how many logs in the batch support a root cause pattern.
 *
 * Returns a 0–1 ratio: (matching error logs) / (total error logs).
 */
function scoreLogCorrelation(logs, patternKeywords) {
  const errorLogs    = logs.filter(l => ['ERROR', 'FATAL'].includes(l.level));
  if (!errorLogs.length) return 0;

  const matchingLogs = errorLogs.filter(log =>
    patternKeywords.some(kw => log.message.toLowerCase().includes(kw))
  );

  return matchingLogs.length / errorLogs.length;
}

function scoreToConfidenceBand(total) {
  if (total >= 75) return 'HIGH';
  if (total >= 50) return 'MEDIUM';
  if (total >= 25) return 'LOW';
  return 'SPECULATIVE';
}

export {
  computeConfidenceScore,
  scoreAlert,
  scoreLogCorrelation,
  scoreToConfidenceBand,
  ALERT_SEVERITY_WEIGHTS,
};
```

---

## Root Cause Candidates — Signal Correlation Engine

The engine generates root cause candidates by correlating logs, alerts, and incident
description against the **Root Cause Pattern Library**. Each pattern defines what
combination of log keywords + alert metrics + incident keywords points to a specific
root cause.

```js
// services/rootCause/rootCausePatterns.js

/**
 * ROOT_CAUSE_PATTERNS — the correlation knowledge base.
 *
 * Each pattern maps a set of observable signals to a probable root cause.
 *
 * Fields:
 *   id              — unique identifier
 *   rootCause       — human-readable description of the probable cause
 *   logKeywords     — keywords that, if found in ERROR/FATAL logs, support this cause
 *   alertMetrics    — metric names that, if breached, support this cause
 *   incidentKeywords— keywords that, if found in title+description, support this cause
 *   nextSteps       — ordered remediation actions for the support engineer
 *
 * Future: technical root causes will be enriched by LLM web lookup.
 * Future: business root causes will be loaded from businessErrorDictionary.json.
 */
const ROOT_CAUSE_PATTERNS = [

  {
    id:        'feed_latency_cascade',
    rootCause: 'Market data feed latency causing stale prices and downstream order rejections',
    logKeywords:      ['timeout', 'stale', 'stale price', 'latency', 'price expired'],
    alertMetrics:     ['feed_latency_ms', 'price_staleness_count', 'feed_handler_lag'],
    incidentKeywords: ['stale', 'price', 'feed', 'latency', 'rejection', 'corporate bond'],
    nextSteps: [
      { action: 'Check market-data-feed upstream provider status page',          owner: 'NOC',     urgency: 'IMMEDIATE' },
      { action: 'Switch to backup feed provider if primary latency > 2000ms',    owner: 'Ops',     urgency: 'IMMEDIATE' },
      { action: 'Temporarily widen staleness threshold to reduce rejections',     owner: 'Ops',     urgency: 'SHORT_TERM' },
      { action: 'Monitor order rejection rate after feed switch (expect < 2min)', owner: 'Support', urgency: 'MONITOR' },
    ],
  },

  {
    id:        'matching_engine_overload',
    rootCause: 'Matching engine CPU/memory saturation causing order processing delays',
    logKeywords:      ['matching-engine', 'queue full', 'backpressure', 'rejected', 'overload', 'slow'],
    alertMetrics:     ['matching_engine_cpu', 'order_queue_depth', 'matching_engine_latency_p99'],
    incidentKeywords: ['matching engine', 'order delay', 'queue', 'processing', 'slow fill'],
    nextSteps: [
      { action: 'Check matching-engine CPU and memory metrics',                   owner: 'NOC',     urgency: 'IMMEDIATE' },
      { action: 'Review order queue depth — throttle inbound if queue > 10k',     owner: 'Ops',     urgency: 'IMMEDIATE' },
      { action: 'Identify and cancel any runaway large-lot orders',               owner: 'Support', urgency: 'SHORT_TERM' },
      { action: 'Scale matching-engine horizontally if persistent overload',       owner: 'Infra',   urgency: 'SHORT_TERM' },
    ],
  },

  {
    id:        'auth_service_degradation',
    rootCause: 'Auth service degradation causing widespread 401/403 errors across services',
    logKeywords:      ['401', '403', 'unauthorized', 'forbidden', 'token invalid', 'jwt', 'auth failed'],
    alertMetrics:     ['auth_error_rate', 'token_validation_failures', 'auth_service_latency'],
    incidentKeywords: ['auth', 'login', 'token', 'unauthorized', 'permission', 'access denied'],
    nextSteps: [
      { action: 'Check auth-service health and error rate dashboard',             owner: 'NOC',     urgency: 'IMMEDIATE' },
      { action: 'Verify JWT signing keys have not been rotated unexpectedly',      owner: 'Security',urgency: 'IMMEDIATE' },
      { action: 'Check auth-service pod restarts — token cache may have cleared', owner: 'Infra',   urgency: 'IMMEDIATE' },
      { action: 'If key rotation confirmed: coordinate client token refresh',      owner: 'Support', urgency: 'SHORT_TERM' },
    ],
  },

  {
    id:        'network_partition',
    rootCause: 'Network partition or DNS failure isolating one or more services',
    logKeywords:      ['connection refused', 'connection reset', 'no route to host', 'dns', 'unreachable', 'network'],
    alertMetrics:     ['service_mesh_error_rate', 'dns_resolution_failures', 'tcp_connection_errors'],
    incidentKeywords: ['network', 'connectivity', 'unreachable', 'partition', 'dns', 'intermittent'],
    nextSteps: [
      { action: 'Run connectivity check from affected pods to target services',    owner: 'Infra',   urgency: 'IMMEDIATE' },
      { action: 'Check DNS resolution for affected service names',                 owner: 'Infra',   urgency: 'IMMEDIATE' },
      { action: 'Review network policy / firewall rules for recent changes',       owner: 'Infra',   urgency: 'SHORT_TERM' },
      { action: 'Check service mesh (Istio/Linkerd) control plane health',         owner: 'Infra',   urgency: 'SHORT_TERM' },
    ],
  },

  {
    id:        'db_connection_exhaustion',
    rootCause: 'Database connection pool exhaustion causing query timeouts and service errors',
    logKeywords:      ['connection pool', 'too many connections', 'deadlock', 'query timeout', 'db error', 'sql'],
    alertMetrics:     ['db_connection_pool_usage', 'db_query_latency_p99', 'db_deadlock_count'],
    incidentKeywords: ['database', 'db', 'connection', 'query', 'slow query', 'deadlock'],
    nextSteps: [
      { action: 'Check DB connection pool usage — identify which service holds most connections', owner: 'DBA',     urgency: 'IMMEDIATE' },
      { action: 'Kill idle/long-running transactions blocking the pool',           owner: 'DBA',     urgency: 'IMMEDIATE' },
      { action: 'Increase connection pool size as a short-term relief valve',      owner: 'DBA',     urgency: 'SHORT_TERM' },
      { action: 'Identify the leak — review services for connection close bugs',   owner: 'Dev',     urgency: 'SHORT_TERM' },
    ],
  },

  {
    id:        'memory_leak_oom',
    rootCause: 'Memory leak or OOM condition causing service instability or restarts',
    logKeywords:      ['out of memory', 'oom', 'heap', 'gc overhead', 'killed', 'restart', 'crash'],
    alertMetrics:     ['heap_usage_percent', 'gc_pause_duration_ms', 'pod_restart_count', 'container_oom_count'],
    incidentKeywords: ['memory', 'oom', 'crash', 'restart', 'heap', 'gc', 'slow'],
    nextSteps: [
      { action: 'Check pod restart count and OOM kill events in the last 30 min', owner: 'Infra',   urgency: 'IMMEDIATE' },
      { action: 'Capture heap dump before next restart for offline analysis',      owner: 'Dev',     urgency: 'SHORT_TERM' },
      { action: 'Increase memory limits as temporary relief to prevent kills',     owner: 'Infra',   urgency: 'SHORT_TERM' },
      { action: 'Identify the leaking object type from heap dump',                 owner: 'Dev',     urgency: 'MONITOR' },
    ],
  },

  {
    id:        'deployment_regression',
    rootCause: 'Recent deployment introduced a regression causing elevated error rates',
    logKeywords:      ['null pointer', 'undefined', 'typeerror', 'exception', 'stack trace', 'unhandled'],
    alertMetrics:     ['error_rate_5xx', 'deployment_event', 'rollback_triggered'],
    incidentKeywords: ['deploy', 'release', 'version', 'regression', 'rollback', 'new build'],
    nextSteps: [
      { action: 'Check deployment timeline — correlate error spike with release time', owner: 'Dev',  urgency: 'IMMEDIATE' },
      { action: 'Review diff of the latest deployment for risky changes',          owner: 'Dev',     urgency: 'IMMEDIATE' },
      { action: 'Initiate rollback if error rate > 10% and rising',                owner: 'Ops',     urgency: 'IMMEDIATE' },
      { action: 'Run smoke tests against the rolled-back version',                 owner: 'QA',      urgency: 'SHORT_TERM' },
    ],
  },

  // Fallback — no pattern matched strongly
  {
    id:        'unknown',
    rootCause: 'Root cause undetermined — insufficient signal correlation',
    logKeywords:      [],
    alertMetrics:     [],
    incidentKeywords: [],
    nextSteps: [
      { action: 'Collect full logs from all affected services for the incident window', owner: 'Support', urgency: 'IMMEDIATE' },
      { action: 'Check for recent deployments, config changes, or infrastructure events', owner: 'Ops', urgency: 'IMMEDIATE' },
      { action: 'Escalate to service owner with collected evidence',               owner: 'Support', urgency: 'SHORT_TERM' },
    ],
  },
];

export { ROOT_CAUSE_PATTERNS };
```

---

## Signal Correlator

The correlator scores each root cause pattern against all three input signals and
assembles the ranked candidate list.

```js
// services/rootCause/signalCorrelator.js

import { ROOT_CAUSE_PATTERNS }           from './rootCausePatterns.js';
import {
  computeConfidenceScore,
  scoreAlert,
  scoreLogCorrelation,
  scoreToConfidenceBand,
}                                        from './confidenceScorer.js';

/**
 * correlateSignals — core ranking engine.
 *
 * For each root cause pattern, independently scores:
 *   - How well the incoming logs match (log keyword overlap)
 *   - How well the active alerts match (metric name + breach ratio)
 *   - How similar past incidents are (from RAG retrieval)
 *
 * Then combines them into a single confidence score and sorts candidates
 * highest-first. Patterns that score 0 on all three signals are excluded.
 */
function correlateSignals(logs, alerts, historicalMatches) {
  const candidates = [];

  for (const pattern of ROOT_CAUSE_PATTERNS) {
    if (pattern.id === 'unknown') continue; // handled separately as fallback

    // --- Signal 1: Log correlation ---
    const logScore = scoreLogCorrelation(logs, pattern.logKeywords);

    // --- Signal 2: Alert correlation ---
    //   Find alerts whose metric name matches the pattern's alertMetrics list
    const matchingAlerts = alerts.filter(alert =>
      pattern.alertMetrics.some(metric =>
        alert.metric.toLowerCase().includes(metric.toLowerCase())
      )
    );
    const alertScore = matchingAlerts.length > 0
      ? Math.max(...matchingAlerts.map(scoreAlert))
      : 0;

    // --- Signal 3: Historical incident similarity ---
    //   Use the top similarity score from RAG retrieval that matches this pattern
    const historicalScore = historicalMatches.length > 0
      ? historicalMatches[0].similarityScore
      : 0;

    // --- Signal convergence: count how many signals fired ---
    const signalCount = [logScore > 0, alertScore > 0, historicalScore > 0.5]
      .filter(Boolean).length;

    // Skip patterns with no signal at all
    if (signalCount === 0) continue;

    const scoreBreakdown = computeConfidenceScore({
      logScore,
      alertScore,
      historicalScore,
      signalCount,
    });

    candidates.push({
      pattern,
      scoreBreakdown,
      matchingLogs:   extractMatchingLogs(logs, pattern.logKeywords),
      matchingAlerts,
    });
  }

  // Sort by confidence score descending; fallback to unknown if nothing scored
  if (candidates.length === 0) {
    const fallback = ROOT_CAUSE_PATTERNS.find(p => p.id === 'unknown');
    candidates.push({
      pattern:        fallback,
      scoreBreakdown: computeConfidenceScore({ logScore: 0, alertScore: 0, historicalScore: 0, signalCount: 0 }),
      matchingLogs:   [],
      matchingAlerts: [],
    });
  }

  return candidates.sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total);
}

/**
 * Extracts log entries that contain at least one of the pattern keywords.
 * Used to populate the supporting evidence section of the response.
 */
function extractMatchingLogs(logs, keywords) {
  return logs.filter(log =>
    ['ERROR', 'FATAL', 'WARN'].includes(log.level) &&
    keywords.some(kw => log.message.toLowerCase().includes(kw))
  );
}

export { correlateSignals };
```

---

## Evidence Builder

Assembles the `supportingEvidence` block for each ranked root cause — tying together
which specific logs, alerts, and historical incidents back the conclusion.

```js
// services/rootCause/evidenceBuilder.js

/**
 * buildEvidence — constructs the human-readable evidence block.
 *
 * For each signal type, adds a `relevance` field explaining WHY that
 * log/alert/incident supports the root cause. This is what the support
 * engineer sees on screen during the incident call.
 */
function buildEvidence(candidate, historicalMatches) {
  const { pattern, matchingLogs, matchingAlerts } = candidate;

  const logs = matchingLogs.map(log => ({
    service:   log.service,
    message:   log.message,
    level:     log.level,
    timestamp: log.timestamp,
    relevance: deriveLogRelevance(log, pattern),
  }));

  const alerts = matchingAlerts.map(alert => ({
    service:   alert.service,
    metric:    alert.metric,
    threshold: alert.threshold,
    current:   alert.current,
    severity:  alert.severity,
    relevance: deriveAlertRelevance(alert),
  }));

  const historicalIncidents = historicalMatches
    .filter(m => m.similarityScore > 0.5)
    .map(({ incident, similarityScore }) => ({
      id:             incident.id,
      title:          incident.title,
      similarityScore,
      rootCause:      incident.rootCause,
      resolution:     incident.resolution,
      resolvedInMin:  incident.resolvedInMin,
      relevance:      `Past incident with ${(similarityScore * 100).toFixed(0)}% similarity — root cause and resolution are directly applicable`,
    }));

  return { logs, alerts, historicalIncidents };
}

function deriveLogRelevance(log, pattern) {
  const matchedKeywords = pattern.logKeywords
    .filter(kw => log.message.toLowerCase().includes(kw));
  return `${log.level} log matches pattern keywords: [${matchedKeywords.join(', ')}]`;
}

function deriveAlertRelevance(alert) {
  const breachMultiple = (alert.current / alert.threshold).toFixed(1);
  return `${alert.metric} is ${breachMultiple}× over threshold (${alert.current} vs ${alert.threshold}) — severity: ${alert.severity}`;
}

export { buildEvidence };
```

---

## Mock LLM Provider for Root Cause

```js
// services/llm/MockRootCauseLLMProvider.js

import { LLMProvider } from './interface.js';

/**
 * MockRootCauseLLMProvider — deterministic root cause summary.
 *
 * Inputs:
 *   analysisData  — { rankedCauses, signalSummary }
 *   context       — historical incidents from RAG retriever
 *
 * Future LLM integration points:
 *   TODO (technical error): LLM performs web search on top root cause
 *        to find known fixes, CVEs, or vendor advisories.
 *   TODO (business error): LLM looks up cause against businessErrorDictionary
 *        to provide domain-specific resolution guidance.
 */
export class MockRootCauseLLMProvider extends LLMProvider {

  async analyze(analysisData, context = []) {
    const { rankedCauses, signalSummary } = analysisData;
    const top = rankedCauses[0];

    if (!top) {
      return 'Insufficient signal to determine root cause. Manual investigation required.';
    }

    const topHistorical = top.supportingEvidence.historicalIncidents[0] ?? null;
    const alertCount    = top.supportingEvidence.alerts.length;
    const logCount      = top.supportingEvidence.logs.length;

    const evidenceLine = [
      logCount   > 0 ? `${logCount} matching log(s)`   : null,
      alertCount > 0 ? `${alertCount} matching alert(s)` : null,
      topHistorical   ? `historical incident "${topHistorical.title}" (${(topHistorical.similarityScore * 100).toFixed(0)}% match)` : null,
    ].filter(Boolean).join(', ');

    const resolutionHint = topHistorical
      ? `Past resolution: ${topHistorical.resolution} (resolved in ${topHistorical.resolvedInMin} min).`
      : '';

    // TODO (future — technical error): call llmProvider.webSearch(top.pattern.id, top.rootCause)
    // and append web-sourced remediation steps here.

    // TODO (future — business error): call businessErrorDictionary.lookup(top.rootCause)
    // and append domain-specific resolution guidance here.

    return [
      `Root cause identified with ${top.confidenceBand} confidence (${top.scoreBreakdown.total}/100):`,
      top.rootCause + '.',
      `Supported by: ${evidenceLine}.`,
      resolutionHint,
      `Immediate action: ${top.nextSteps[0]?.action ?? 'See investigation steps.'}`,
    ].filter(Boolean).join(' ');
  }
}
```

---

## Orchestrator — Readable Step-by-Step

```js
// services/rootCause/index.js

import { validateRootCauseRequest }   from './validator.js';
import { buildVectorStore }           from '../logAnalysis/embedder.js';
import { clusterBySimilarity }        from '../logAnalysis/clusterer.js';
import { retrieveContextForAnalysis } from '../rag/retriever.js';
import { retrieveRelevantIncidents }  from '../rag/retriever.js';
import { correlateSignals }           from './signalCorrelator.js';
import { buildEvidence }              from './evidenceBuilder.js';
import { scoreToConfidenceBand }      from './confidenceScorer.js';
import { getRootCauseLLMProvider }    from '../llm/index.js';

/**
 * suggestRootCauses — main entry point.
 *
 * Readable step-by-step pipeline:
 *   1.  Validate all three inputs (logs, alerts, incident)
 *   2.  Embed logs and cluster by similarity (re-uses Req 01 modules)
 *   3.  RAG — retrieve historical incidents using cluster + incident description as queries
 *   4.  Correlate all three signals against root cause patterns → ranked candidates
 *   5.  Build supporting evidence for each candidate
 *   6.  Shape the final ranked root cause list
 *   7.  Mock LLM — generate augmented summary (real LLM plug-in point)
 *   8.  Return structured response
 */
async function suggestRootCauses(rawRequest) {
  // 1. Validate and normalise all inputs
  const { logs, alerts, incident } = validateRootCauseRequest(rawRequest);

  // 2. Embed and cluster log messages (identifies dominant error themes)
  const vectorStore = await buildVectorStore(logs);
  const clusters    = await clusterBySimilarity(logs, vectorStore);

  // 3. RAG — retrieve historical incidents
  //    Query 1: from log clusters (same approach as Req 01)
  //    Query 2: from incident description (same approach as Req 02)
  //    Merge and de-duplicate — more signal sources = better retrieval coverage
  const logContext      = await retrieveContextForAnalysis(clusters);
  const incidentContext = await retrieveRelevantIncidents(
    `${incident.title} ${incident.description}`
  );
  const historicalMatches = deduplicateMatches([...logContext, ...incidentContext]);

  // 4. Correlate logs + alerts + historical similarity against root cause patterns
  const rankedCandidates = correlateSignals(logs, alerts, historicalMatches);

  // 5. Build supporting evidence for each candidate (logs + alerts + incidents that back it)
  const rankedCauses = rankedCandidates.map((candidate, idx) => ({
    rank:             idx + 1,
    rootCause:        candidate.pattern.rootCause,
    confidenceScore:  candidate.scoreBreakdown.total,
    confidenceBand:   scoreToConfidenceBand(candidate.scoreBreakdown.total),
    scoreBreakdown:   candidate.scoreBreakdown,
    supportingEvidence: buildEvidence(candidate, historicalMatches),
    nextSteps:        candidate.pattern.nextSteps.map((s, i) => ({ step: i + 1, ...s })),
  }));

  // 6. Signal summary for the response envelope
  const signalSummary = {
    logsAnalyzed:       logs.length,
    alertsAnalyzed:     alerts.length,
    historicalMatches:  historicalMatches.length,
  };

  // 7. Mock LLM — generates the human-readable summary from ranked causes + context
  const llm     = getRootCauseLLMProvider();
  const summary = await llm.analyze({ rankedCauses, signalSummary }, historicalMatches);

  return {
    analyzedAt: new Date().toISOString(),
    rootCauses: rankedCauses,
    signalSummary,
    summary,
  };
}

/**
 * De-duplicates merged RAG results by incident ID, keeping the highest score.
 */
function deduplicateMatches(matches) {
  const seen = new Map();
  for (const match of matches) {
    const id = match.incident.id;
    if (!seen.has(id) || match.similarityScore > seen.get(id).similarityScore) {
      seen.set(id, match);
    }
  }
  return [...seen.values()].sort((a, b) => b.similarityScore - a.similarityScore);
}

export { suggestRootCauses };
```

---

## Distributed Trace Flow Visualization

### Why trace-based visualization

In a distributed system, a single client request fans out across multiple services.
When it fails, the logs appear across different services with different timestamps —
making it hard to see the call chain or pinpoint where the failure originated.

Every log entry with a `traceId` field is a breadcrumb in that request's journey.
By grouping logs by `traceId` and ordering them by `timestamp`, we can reconstruct
the **exact path the request took** through the service graph and mark exactly where
it broke.

This is surfaced in the root-cause response as a `traceFlows` section — one entry
per unique traceId found in the incoming log batch.

---

### Cross-Service TraceId Scenarios (from Seed Data)

The six log scenarios in `logs.json` each contain logs with **shared traceIds spanning
multiple services**. These are the traces used to build the flow diagrams:

| Scenario | TraceId | Services spanned | Failure point |
|---|---|---|---|
| `feed_latency_cascade` | `trc-8821` | order-gateway → matching-engine → market-data-feed | matching-engine (STALE_PRICE rejection) |
| `connection_pool_exhaustion` | `trc-9001` | order-gateway → orders-db | order-gateway (pool exhausted, timeout) |
| `memory_leak_oom` | `trc-oom-5501` | api-gateway → order-gateway | api-gateway (upstream health check fail) |
| `gc_pause_retry_storm` | `trc-7001` | order-gateway → matching-engine → risk-engine | matching-engine (GC pause timeout) |
| `auth_token_mass_expiry` | `trc-api-9821` | api-gateway → auth-service → order-gateway | api-gateway (JWT validation fail) |
| `replication_lag_deadlock` | `trc-stlm-2240` | trade-reporting → settlement-service → CCP | settlement-service (duplicate submission) |

---

### Trace Flow Data Model

```js
// Each reconstructed trace returned in the response
{
  traceId:       "trc-8821",
  spanCount:     4,                    // total log entries for this trace
  durationMs:    1890,                 // last timestamp - first timestamp
  status:        "FAILED",            // OK | DEGRADED | FAILED
  failureService: "matching-engine",  // service where first ERROR/FATAL appeared
  failureMessage: "Order ORD-8821 rejected: price reference stale",
  serviceFlow: [
    {
      service:    "order-gateway",
      instance:   "order-gateway-4",
      timestamp:  "2024-01-12T11:04:51.334Z",
      level:      "ERROR",
      message:    "Order ORD-8821 returned REJECTED from matching-engine: STALE_PRICE",
      status:     "ERROR",
      durationFromPreviousMs: null    // first hop
    },
    {
      service:    "matching-engine",
      instance:   "matching-engine-3",
      timestamp:  "2024-01-12T11:04:51.003Z",
      level:      "ERROR",
      message:    "Order ORD-8821 rejected: price reference stale (3100ms > 1000ms)",
      status:     "ERROR",
      durationFromPreviousMs: 0       // happened before order-gateway logged it
    }
  ],
  diagram: [
    "Trace: trc-8821  |  Duration: 1890ms  |  Status: FAILED",
    "──────────────────────────────────────────────────────────",
    "  [order-gateway:order-gateway-4]   11:04:51.334  ERROR",
    "    └─▶ [matching-engine:matching-engine-3]  11:04:51.003  ✗ ERROR  ◀── FAILURE ORIGIN",
    "          └─▶ price reference stale (3100ms > 1000ms threshold)",
    "──────────────────────────────────────────────────────────",
    "  Failure propagation: matching-engine → order-gateway (cascade)"
  ]
}
```

---

### Trace Extractor

```js
// services/rootCause/traceExtractor.js

/**
 * extractTraceFlows — groups logs by traceId and reconstructs the service call chain.
 *
 * Only logs with a non-null traceId are included.
 * Logs without a traceId (infrastructure/metrics logs) are excluded from traces
 * but still used for log correlation in the confidence scorer.
 *
 * Returns: Array of reconstructed trace flows, sorted by status severity
 *          (FAILED first, then DEGRADED, then OK).
 */
function extractTraceFlows(logs) {
  // Step 1: Group logs by traceId — skip entries with no traceId
  const traceMap = new Map();

  for (const log of logs) {
    if (!log.traceId) continue;

    if (!traceMap.has(log.traceId)) {
      traceMap.set(log.traceId, []);
    }
    traceMap.get(log.traceId).push(log);
  }

  // Step 2: For each trace, sort by timestamp and build the flow
  const traces = [];
  for (const [traceId, traceLogs] of traceMap) {
    const sorted = [...traceLogs].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    traces.push(buildTraceFlow(traceId, sorted));
  }

  // Step 3: Sort traces — FAILED first (most important for investigation)
  const statusOrder = { FAILED: 0, DEGRADED: 1, OK: 2 };
  return traces.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

/**
 * buildTraceFlow — converts a sorted array of logs for one traceId
 * into a structured flow object with a text diagram.
 */
function buildTraceFlow(traceId, sortedLogs) {
  const first = sortedLogs[0];
  const last  = sortedLogs[sortedLogs.length - 1];
  const durationMs = new Date(last.timestamp) - new Date(first.timestamp);

  // Determine overall trace status from worst log level seen
  const status = deriveTraceStatus(sortedLogs);

  // Find the failure origin — first log with ERROR or FATAL level
  const failureLog = sortedLogs.find(l => ['ERROR', 'FATAL'].includes(l.level)) ?? null;

  // Build the per-hop service flow
  const serviceFlow = sortedLogs.map((log, i) => ({
    service:                log.service,
    instance:               log.instance ?? log.service,
    timestamp:              log.timestamp,
    level:                  log.level,
    message:                log.message,
    status:                 levelToStatus(log.level),
    durationFromPreviousMs: i === 0
      ? null
      : new Date(log.timestamp) - new Date(sortedLogs[i - 1].timestamp),
  }));

  return {
    traceId,
    spanCount:      sortedLogs.length,
    durationMs,
    status,
    failureService: failureLog?.service ?? null,
    failureMessage: failureLog?.message ?? null,
    serviceFlow,
    diagram:        renderDiagram(traceId, durationMs, status, serviceFlow, failureLog),
  };
}

function deriveTraceStatus(logs) {
  const levels = new Set(logs.map(l => l.level));
  if (levels.has('FATAL') || levels.has('ERROR')) return 'FAILED';
  if (levels.has('WARN'))                          return 'DEGRADED';
  return 'OK';
}

function levelToStatus(level) {
  if (['ERROR', 'FATAL'].includes(level)) return 'ERROR';
  if (level === 'WARN')                   return 'WARN';
  return 'OK';
}

export { extractTraceFlows };
```

---

### Diagram Renderer

Produces a plain-text ASCII diagram of the service call chain.
Designed to be readable in a terminal, a log viewer, or a web UI monospace panel.

```js
// services/rootCause/diagramRenderer.js

const STATUS_ICON = { OK: '✓', WARN: '⚠', ERROR: '✗', FATAL: '✗' };
const INDENT      = '  ';

/**
 * renderDiagram — produces a multi-line ASCII service flow diagram.
 *
 * Example output for a 3-hop failed trace:
 *
 *   Trace: trc-8821  |  Duration: 1890ms  |  Status: FAILED
 *   ──────────────────────────────────────────────────────────────────
 *   [order-gateway / order-gateway-4]       11:04:51.334   ✗ ERROR
 *     └─▶ [matching-engine / matching-engine-3]  11:04:51.003   ✗ ERROR  ◀── FAILURE ORIGIN
 *           Message: Order ORD-8821 rejected: price reference stale (3100ms > 1000ms)
 *     └─▶ [market-data-feed / market-data-feed-1]  11:04:49.001  ✗ ERROR
 *           Message: Feed handler latency 5400ms — upstream connection lost
 *   ──────────────────────────────────────────────────────────────────
 *   Failure propagation: market-data-feed → matching-engine → order-gateway
 */
function renderDiagram(traceId, durationMs, status, serviceFlow, failureLog) {
  const separator = '─'.repeat(66);
  const header    = `Trace: ${traceId}  |  Duration: ${durationMs}ms  |  Status: ${status}`;

  const lines = [header, separator];

  for (let i = 0; i < serviceFlow.length; i++) {
    const hop        = serviceFlow[i];
    const icon       = STATUS_ICON[hop.status] ?? '?';
    const time       = hop.timestamp.slice(11, 23); // HH:MM:SS.mmm
    const prefix     = i === 0 ? '' : `${INDENT}└─▶ `;
    const indentPad  = INDENT.repeat(i);
    const failureTag = hop.service === failureLog?.service ? '  ◀── FAILURE ORIGIN' : '';
    const durationTag = hop.durationFromPreviousMs !== null
      ? `  (+${hop.durationFromPreviousMs}ms)`
      : '';

    lines.push(
      `${indentPad}${prefix}[${hop.service} / ${hop.instance}]  ${time}  ${icon} ${hop.status}${durationTag}${failureTag}`
    );

    // Indent the message under the service line for readability
    if (['ERROR', 'FATAL', 'WARN'].includes(hop.level)) {
      lines.push(`${indentPad}${INDENT}${i > 0 ? '      ' : '  '}Message: ${hop.message}`);
    }
  }

  lines.push(separator);

  // Propagation summary — services from failure origin to surface
  const failIdx        = serviceFlow.findIndex(h => h.service === failureLog?.service);
  const propagationSvcs = failIdx >= 0
    ? serviceFlow.slice(failIdx).map(h => h.service)
    : [];
  if (propagationSvcs.length > 1) {
    lines.push(`Failure propagation: ${propagationSvcs.join(' → ')}`);
  }

  return lines;
}

export { renderDiagram };
```

---

### Example Diagrams for Each Seed Scenario

#### Scenario 1 — `feed_latency_cascade` (trc-8821)

```
Trace: trc-8821  |  Duration: 1890ms  |  Status: FAILED
──────────────────────────────────────────────────────────────────
[market-data-feed / market-data-feed-1]  11:04:49.001  ✗ ERROR
  Message: Feed handler latency 5400ms — upstream connection to bloomberg-feed-primary lost
  └─▶ [price-engine / price-engine-1]  11:04:50.220  ✗ ERROR  (+1219ms)  ◀── FAILURE ORIGIN
        Message: Stale price detected for US38141GXZ52: last update 3.1s ago
    └─▶ [matching-engine / matching-engine-3]  11:04:51.003  ✗ ERROR  (+783ms)
          Message: Order ORD-8821 rejected: price reference stale (3100ms > 1000ms threshold)
        └─▶ [order-gateway / order-gateway-4]  11:04:51.334  ✗ ERROR  (+331ms)
              Message: Order ORD-8821 returned REJECTED from matching-engine: STALE_PRICE
──────────────────────────────────────────────────────────────────
Failure propagation: price-engine → matching-engine → order-gateway
```

#### Scenario 2 — `connection_pool_exhaustion` (trc-9001)

```
Trace: trc-9001  |  Duration: 1000ms  |  Status: FAILED
──────────────────────────────────────────────────────────────────
[order-gateway / order-gateway-1]  08:00:05.220  ✗ ERROR  ◀── FAILURE ORIGIN
  Message: Connection pool exhausted on orders-db — all 20 connections in use. Queue depth: 4
  └─▶ [order-gateway / order-gateway-1]  08:00:06.334  ✗ ERROR  (+1114ms)
        Message: Order ORD-9001 failed: connection acquisition timeout after 500ms
──────────────────────────────────────────────────────────────────
Failure propagation: order-gateway (DB layer) → order-gateway (client response)
```

#### Scenario 3 — `gc_pause_retry_storm` (trc-7001)

```
Trace: trc-7001  |  Duration: 4001ms  |  Status: FAILED
──────────────────────────────────────────────────────────────────
[matching-engine / matching-engine-1]  13:15:00.112  ⚠ WARN
  Message: GC pause started — all request threads suspended
  └─▶ [matching-engine / matching-engine-1]  13:15:03.889  ✗ ERROR  (+3777ms)  ◀── FAILURE ORIGIN
        Message: GC pause 3777ms — 1412 in-flight requests timed out
    └─▶ [order-gateway / order-gateway-1]  13:15:04.001  ✗ ERROR  (+112ms)
          Message: Timeout waiting for matching-engine after 2000ms — retrying
        └─▶ [risk-engine / risk-engine-1]  13:15:07.334  ✗ ERROR  (+3333ms)
              Message: Pre-trade risk check timeout: matching-engine unreachable
──────────────────────────────────────────────────────────────────
Failure propagation: matching-engine → order-gateway → risk-engine
```

#### Scenario 4 — `auth_token_mass_expiry` (trc-api-9821)

```
Trace: trc-api-9821  |  Duration: 5000ms  |  Status: FAILED
──────────────────────────────────────────────────────────────────
[api-gateway / api-gateway-2]  18:00:01.334  ✗ ERROR  ◀── FAILURE ORIGIN
  Message: JWT validation failed for client-9821: unknown key ID key-2024-01-17-v1
  └─▶ [auth-service / auth-service-2]  18:00:02.001  ✗ ERROR  (+667ms)
        Message: Re-authentication burst: 847 req/sec — 12× baseline
    └─▶ [order-gateway / order-gateway-3]  18:00:03.334  ✗ ERROR  (+1333ms)
          Message: Downstream auth-service returning 503 — rejecting orders with 401
──────────────────────────────────────────────────────────────────
Failure propagation: api-gateway (JWT) → auth-service → order-gateway
```

#### Scenario 5 — `replication_lag_deadlock` (trc-stlm-2240)

```
Trace: trc-stlm-2240  |  Duration: 1000ms  |  Status: FAILED
──────────────────────────────────────────────────────────────────
[trade-reporting / trade-reporting-1]  15:46:10.001  ✗ ERROR
  Message: Replication lag 188s — WAL replay blocked by long-running query
  └─▶ [settlement-service / settlement-service-1]  15:46:16.001  ✗ ERROR  ◀── FAILURE ORIGIN
        Message: Idempotency check from replica (lag 188s) — record not found. Submitting to CCP
    └─▶ [settlement-service / settlement-service-1]  15:46:20.001  ✗ ERROR  (+4000ms)
          Message: CCP rejected STLM-2240 as duplicate — settlement already exists
──────────────────────────────────────────────────────────────────
Failure propagation: trade-reporting (lag) → settlement-service → CCP rejection
```

---

### Updated Orchestrator (adds trace extraction as step 5)

```js
// services/rootCause/index.js  (updated — step 5 added)

import { validateRootCauseRequest }   from './validator.js';
import { buildVectorStore }           from '../logAnalysis/embedder.js';
import { clusterBySimilarity }        from '../logAnalysis/clusterer.js';
import { retrieveContextForAnalysis } from '../rag/retriever.js';
import { retrieveRelevantIncidents }  from '../rag/retriever.js';
import { correlateSignals }           from './signalCorrelator.js';
import { buildEvidence }              from './evidenceBuilder.js';
import { scoreToConfidenceBand }      from './confidenceScorer.js';
import { extractTraceFlows }          from './traceExtractor.js';
import { getRootCauseLLMProvider }    from '../llm/index.js';

async function suggestRootCauses(rawRequest) {
  // 1. Validate and normalise all inputs
  const { logs, alerts, incident } = validateRootCauseRequest(rawRequest);

  // 2. Embed and cluster log messages
  const vectorStore = await buildVectorStore(logs);
  const clusters    = await clusterBySimilarity(logs, vectorStore);

  // 3. RAG — retrieve historical incidents (from clusters + incident description)
  const logContext        = await retrieveContextForAnalysis(clusters);
  const incidentContext   = await retrieveRelevantIncidents(`${incident.title} ${incident.description}`);
  const historicalMatches = deduplicateMatches([...logContext, ...incidentContext]);

  // 4. Correlate all three signals → ranked root cause candidates
  const rankedCandidates = correlateSignals(logs, alerts, historicalMatches);

  // 5. Extract distributed trace flows — group logs by traceId, reconstruct call chains
  //    This shows exactly which service in which instance failed and how it propagated
  const traceFlows = extractTraceFlows(logs);

  // 6. Build supporting evidence for each candidate
  const rankedCauses = rankedCandidates.map((candidate, idx) => ({
    rank:               idx + 1,
    rootCause:          candidate.pattern.rootCause,
    confidenceScore:    candidate.scoreBreakdown.total,
    confidenceBand:     scoreToConfidenceBand(candidate.scoreBreakdown.total),
    scoreBreakdown:     candidate.scoreBreakdown,
    supportingEvidence: buildEvidence(candidate, historicalMatches),
    nextSteps:          candidate.pattern.nextSteps.map((s, i) => ({ step: i + 1, ...s })),
  }));

  // 7. Signal summary
  const signalSummary = {
    logsAnalyzed:       logs.length,
    alertsAnalyzed:     alerts.length,
    historicalMatches:  historicalMatches.length,
    tracesReconstructed: traceFlows.length,
    failedTraces:       traceFlows.filter(t => t.status === 'FAILED').length,
  };

  // 8. Mock LLM — augmented summary
  const llm     = getRootCauseLLMProvider();
  const summary = await llm.analyze({ rankedCauses, signalSummary, traceFlows }, historicalMatches);

  return {
    analyzedAt:  new Date().toISOString(),
    rootCauses:  rankedCauses,
    traceFlows,              // new — full trace reconstruction per traceId
    signalSummary,
    summary,
  };
}
```

---

### Updated Response Schema (traceFlows added)

```json
{
  "data": {
    "analyzedAt": "2024-01-12T11:05:00.000Z",
    "rootCauses": [ "... (same as before) ..." ],
    "traceFlows": [
      {
        "traceId":        "trc-8821",
        "spanCount":      4,
        "durationMs":     1890,
        "status":         "FAILED",
        "failureService": "price-engine",
        "failureMessage": "Stale price detected for US38141GXZ52: last update 3.1s ago",
        "serviceFlow": [
          {
            "service":               "market-data-feed",
            "instance":              "market-data-feed-1",
            "timestamp":             "2024-01-12T11:04:49.001Z",
            "level":                 "ERROR",
            "message":               "Feed handler latency 5400ms — upstream connection lost",
            "status":                "ERROR",
            "durationFromPreviousMs": null
          },
          {
            "service":               "price-engine",
            "instance":              "price-engine-1",
            "timestamp":             "2024-01-12T11:04:50.220Z",
            "level":                 "ERROR",
            "message":               "Stale price detected for US38141GXZ52",
            "status":                "ERROR",
            "durationFromPreviousMs": 1219
          }
        ],
        "diagram": [
          "Trace: trc-8821  |  Duration: 1890ms  |  Status: FAILED",
          "──────────────────────────────────────────────────────────────────",
          "[market-data-feed / market-data-feed-1]  11:04:49.001  ✗ ERROR",
          "  Message: Feed handler latency 5400ms — upstream connection lost",
          "  └─▶ [price-engine / price-engine-1]  11:04:50.220  ✗ ERROR  (+1219ms)  ◀── FAILURE ORIGIN",
          "        Message: Stale price detected for US38141GXZ52",
          "    └─▶ [matching-engine / matching-engine-3]  11:04:51.003  ✗ ERROR  (+783ms)",
          "          Message: Order ORD-8821 rejected: price reference stale",
          "        └─▶ [order-gateway / order-gateway-4]  11:04:51.334  ✗ ERROR  (+331ms)",
          "              Message: Order ORD-8821 returned REJECTED: STALE_PRICE",
          "──────────────────────────────────────────────────────────────────",
          "Failure propagation: price-engine → matching-engine → order-gateway"
        ]
      }
    ],
    "signalSummary": {
      "logsAnalyzed":        12,
      "alertsAnalyzed":       3,
      "historicalMatches":    2,
      "tracesReconstructed":  3,
      "failedTraces":         2
    },
    "summary": "..."
  }
}
```

---

## File Structure

```
src/
  routes/
    incidents.js                      # POST /api/v1/incidents/root-cause
  controllers/
    incidentsController.js            # rootCauseHandler added
  services/
    rootCause/
      index.js                        # orchestrator — 9 readable steps (trace extraction added)
      validator.js                    # validate logs + alerts + incident
      rootCausePatterns.js            # pattern library (signal → root cause + next steps)
      signalCorrelator.js             # scores all patterns against 3 signals → ranked list
      confidenceScorer.js             # 4-signal composite score formula
      evidenceBuilder.js              # assembles supporting evidence per candidate
      traceExtractor.js               # groups logs by traceId → reconstructed call chains
      diagramRenderer.js              # call chain → ASCII diagram lines
    rag/
      knowledgeStore.js               # shared singleton
      retriever.js                    # shared — used by Req 01, 02, 03
    llm/
      interface.js                    # shared LLMProvider base class
      index.js                        # factory
      MockRootCauseLLMProvider.js     # deterministic root cause summary
    logAnalysis/
      embedder.js                     # re-used — buildVectorStore
      clusterer.js                    # re-used — clusterBySimilarity
  data/
    incidents.json                    # seed historical incidents
    logs.json                         # seed log batches with cross-service traceIds
```

---

## How the Three Signals Work Together

```
  Incoming logs              Active alerts           Incident description
       │                          │                          │
       ▼                          ▼                          ▼
  Embed + cluster         Match metric names         RAG retrieval
  (Req 01 modules)        against pattern            (Req 02 approach)
       │                  alertMetrics list                  │
       ▼                          │                          │
  Log keyword                Alert breach              Historical similarity
  match score                   score                       score
  (0–30 pts)               (0–30 pts)                   (0–25 pts)
       │                          │                          │
       └──────────┬───────────────┘                          │
                  ▼                                          │
         Signal convergence ◄──────────────────────────────┘
              bonus
           (0–15 pts if ≥2
            signals agree)
                  │
                  ▼
         Confidence score (0–100)
         ranked root cause list
```

The **convergence bonus** is the key differentiator: a root cause that shows up in
logs *and* alerts *and* past incidents gets 15 extra points. This rewards multi-signal
consensus and penalises single-source guesses.

---

## Testing Requirements

| Test | What to assert |
|---|---|
| Validator | Rejects missing `alerts`, empty `logs`, invalid alert `severity`; passes valid request |
| `scoreLogCorrelation` | All matching → 1.0; none matching → 0.0; partial → fractional |
| `scoreAlert` | CRITICAL at 5× threshold → ~1.0; LOW at 1.1× → near 0 |
| `computeConfidenceScore` | Total never exceeds 100; convergence bonus added only when signalCount ≥ 2 |
| `scoreToConfidenceBand` | 88→HIGH, 60→MEDIUM, 35→LOW, 10→SPECULATIVE |
| `correlateSignals` | Returns candidates sorted descending; unknown fallback returned when no signals fire |
| `deduplicateMatches` | Duplicate incident IDs collapsed to highest score entry |
| `buildEvidence` | Each log has `relevance` field; each alert has breach ratio in `relevance` |
| `MockRootCauseLLMProvider` | Non-empty string; mentions confidenceBand; mentions top root cause |
| End-to-end POST | 200 with valid body; `rootCauses[0].rank === 1`; `scoreBreakdown.total ≤ 100` |
| Convergence bonus | Sending matching logs + matching alerts → convergenceBonus = 15 |
| No signal fallback | Sending unrelated logs + no alerts → `rootCauses[0].pattern.id === 'unknown'` |
| `extractTraceFlows` | Logs with same traceId grouped into one flow; logs with null traceId excluded |
| Trace status | All OK logs → status=OK; any WARN → DEGRADED; any ERROR/FATAL → FAILED |
| FAILED first | `traceFlows[0].status === 'FAILED'` when mixed statuses present |
| Failure origin | `failureService` = service of the chronologically first ERROR/FATAL log in trace |
| `durationMs` | Equals `last.timestamp - first.timestamp` for the trace |
| `durationFromPreviousMs` | First hop is null; subsequent hops show ms gap from previous log |
| `renderDiagram` | Returns array of strings; contains `◀── FAILURE ORIGIN` on failure line |
| Propagation summary | Multi-hop failed trace includes "Failure propagation: A → B → C" line |
| `signalSummary.tracesReconstructed` | Equals number of unique non-null traceIds in log batch |
| End-to-end with traces | POST response contains `traceFlows` array; each entry has `diagram` array |

---

## Performance Profile

| Operation | Complexity | Note |
|---|---|---|
| Log embedding + clustering | O(n × k) | n logs, k store size — same as Req 01 |
| Alert correlation | O(a × p × m) | a alerts, p patterns, m metrics per pattern — all small constants |
| Log correlation | O(l × p × w) | l logs, p patterns, w keywords — small constants |
| RAG retrieval (×2) | O(k) each | One for log clusters, one for incident description |
| Evidence building | O(c × l) | c candidates, l logs |
| **Total** | **O(n × k)** | Dominated by log embedding — same profile as Req 01 |

**At scale:** Same improvements as Req 01/02 — ANN index for vector store,
batch embedding API calls, pre-computed alert metric indexes.

---

## Future Integration Points

### Technical Error → LLM Web Lookup
When `top.pattern.id` is a known technical pattern, the real LLM provider will:
1. Search for the root cause + service name (e.g., "matching-engine connection timeout fix").
2. Return vendor docs, known issues, or CVEs as additional next steps.

Plug-in point: `MockRootCauseLLMProvider.analyze()` — first `TODO` block.

### Business Error → Domain Dictionary
When the incident or logs contain business-domain terms (e.g., "margin call", "settlement"),
the business error dictionary will provide regulatory / ops resolution steps.

Plug-in point: same `MockRootCauseLLMProvider.analyze()` — second `TODO` block.
