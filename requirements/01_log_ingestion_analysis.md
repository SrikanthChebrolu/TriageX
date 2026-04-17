# Requirement 01 — Log Ingestion & Analysis

## Overview

Build a REST endpoint that accepts a batch of structured log entries, embeds them into an
in-memory vector store, scores them against each other for similarity, and returns a grouped
analysis summary — by **service** and by **time period**.

No LLM call is required. The intelligence comes entirely from vector similarity scoring
(semantic distance between log messages) using **LangChain** + an in-memory vector store.

---

## Endpoint

```
POST /api/v1/logs/analyze
Content-Type: application/json
```

---

## Request Schema

```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T14:32:01.123Z",   // ISO 8601 — required
      "level":     "ERROR",                        // DEBUG | INFO | WARN | ERROR | FATAL — required
      "service":   "order-gateway",                // originating service name — required
      "message":   "Connection timeout to matching-engine after 5000ms", // required
      "traceId":   "abc-123-xyz"                  // correlation ID — optional
    }
  ]
}
```

**Validation rules:**
- `logs` must be a non-empty array (max 500 entries per batch).
- `timestamp` must be a valid ISO 8601 string.
- `level` must be one of: `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`.
- `service` and `message` are required non-empty strings.
- Unknown fields are ignored.

---

## Response Schema

```json
{
  "data": {
    "totalLogs":      42,
    "analyzedAt":     "2024-01-15T14:33:00.000Z",
    "byService": {
      "order-gateway": {
        "logCount":    18,
        "errorCount":  12,
        "errorRate":   0.67,
        "clusters": [
          {
            "clusterId":      "c-001",
            "representativeMessage": "Connection timeout to matching-engine after 5000ms",
            "similarityScore": 0.94,
            "memberCount":    8,
            "levels":         ["ERROR", "FATAL"],
            "traceIds":       ["abc-123", "abc-456"],
            "firstSeen":      "2024-01-15T14:30:00.000Z",
            "lastSeen":       "2024-01-15T14:32:45.000Z"
          }
        ]
      }
    },
    "byTimePeriod": {
      "2024-01-15T14:30:00Z/PT1M": {
        "windowStart":  "2024-01-15T14:30:00.000Z",
        "windowEnd":    "2024-01-15T14:31:00.000Z",
        "logCount":     15,
        "errorCount":   11,
        "errorRate":    0.73,
        "spikeDetected": true,
        "services":     ["order-gateway", "matching-engine"]
      }
    },
    "anomalies": [
      {
        "type":        "error_spike",
        "service":     "order-gateway",
        "windowStart": "2024-01-15T14:30:00.000Z",
        "windowEnd":   "2024-01-15T14:31:00.000Z",
        "detail":      "Error rate jumped from 5% to 73% within 1 minute"
      }
    ],
    "summary": "12 errors across order-gateway and matching-engine between 14:30–14:33 UTC. Primary cluster: connection timeouts (similarity 0.94). Error rate spike detected at 14:30. Likely connectivity issue between order-gateway and matching-engine."
  },
  "error": null,
  "meta": {
    "processingMs": 42
  }
}
```

---

## Implementation Architecture

### Pipeline (step-by-step, readable flow)

```
Incoming logs
     │
     ▼
1. VALIDATE        — reject malformed entries, return 422 with field errors
     │
     ▼
2. NORMALIZE       — parse timestamps, uppercase level, trim strings
     │
     ▼
3. EMBED           — convert each log message → embedding vector
     │              (LangChain FakeEmbeddings or TF-IDF vectors for mock)
     ▼
4. STORE           — upsert vectors into MemoryVectorStore (LangChain)
     │              keyed by a hash of (service + message + timestamp)
     ▼
5. CLUSTER         — for each log, find its k nearest neighbours in the store
     │              group logs whose similarity score ≥ threshold (default 0.85)
     │              into a cluster; elect the most central as representative
     ▼
6. GROUP BY SERVICE   — bucket clusters + raw counts per service
     │
     ▼
7. GROUP BY TIME PERIOD — bucket logs into 1-minute tumbling windows
     │                    compute errorRate per window
     │                    flag windows where errorRate > 2× the batch average (spike)
     ▼
8. DETECT ANOMALIES   — collect spike flags, surface as anomaly objects
     │
     ▼
9. SUMMARIZE       — produce human-readable summary string
     │              (template-based; LLM can drop in here later)
     ▼
10. RESPOND        — return structured JSON
```

---

## LangChain Integration

### Why LangChain (without an LLM)

LangChain provides two things we need here:
- **`Embeddings` interface** — a standard contract for turning text → vector. We use
  `FakeEmbeddings` (deterministic, no API key) so the pipeline is self-contained and testable.
  A real `OpenAIEmbeddings` or `BedrockEmbeddings` can drop in with zero changes to the
  clustering logic.
- **`MemoryVectorStore`** — an in-memory vector store with cosine similarity search built in.
  No database, no setup.

### Modules to use

| LangChain module | Purpose |
|---|---|
| `@langchain/core/embeddings` | `FakeEmbeddings` — turns log messages into deterministic float vectors |
| `langchain/vectorstores/memory` | `MemoryVectorStore` — stores and queries vectors in RAM |
| `langchain/schema` | `Document` — wraps a log entry as a LangChain document with metadata |

### Embedding strategy

Each log entry is converted to a `Document` before embedding:

```js
// services/logAnalysis/embedder.js

import { FakeEmbeddings } from '@langchain/core/utils/testing';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/schema';

/**
 * Converts a normalised log entry into a LangChain Document.
 * The page_content is what gets embedded (the message text).
 * All other fields go into metadata for retrieval.
 */
function logToDocument(log) {
  return new Document({
    pageContent: log.message,
    metadata: {
      timestamp: log.timestamp,
      level:     log.level,
      service:   log.service,
      traceId:   log.traceId ?? null,
    },
  });
}

/**
 * Embeds all log documents into a fresh in-memory vector store.
 * Returns the store — callers query it for nearest neighbours.
 */
async function buildVectorStore(logs) {
  const embeddings = new FakeEmbeddings();
  const documents  = logs.map(logToDocument);
  return MemoryVectorStore.fromDocuments(documents, embeddings);
}

export { buildVectorStore, logToDocument };
```

---

## Similarity Scoring & Clustering

### How scoring works

After the vector store is built, each log is compared against every other log using
cosine similarity on their embedding vectors.

```
similarityScore = cosine(vectorA, vectorB)
                = (A · B) / (|A| × |B|)

Range: 0.0 (completely different) → 1.0 (identical)
```

Logs with `similarityScore ≥ 0.85` are placed in the same cluster.

### Clustering algorithm (union-find, readable)

```js
// services/logAnalysis/clusterer.js

const SIMILARITY_THRESHOLD = 0.85;

/**
 * Clusters logs by semantic similarity.
 *
 * For each log, we ask the vector store: "give me the k most similar logs".
 * Any pair whose score meets the threshold gets merged into the same cluster
 * using a simple union-find structure.
 *
 * Returns: Array of clusters, each with a list of member log indices
 *          and the similarity score of the closest pair.
 */
async function clusterBySimilarity(logs, vectorStore) {
  // Step 1: build a parent map for union-find
  const parent = logs.map((_, i) => i);

  function find(i) {
    if (parent[i] !== i) parent[i] = find(parent[i]); // path compression
    return parent[i];
  }

  function union(i, j) {
    parent[find(i)] = find(j);
  }

  // Step 2: for each log, find its nearest neighbours
  for (let i = 0; i < logs.length; i++) {
    const neighbours = await vectorStore.similaritySearchWithScore(
      logs[i].message,
      10  // top-k candidates
    );

    for (const [doc, score] of neighbours) {
      const j = logs.findIndex(l => l.message === doc.pageContent);
      if (j !== -1 && j !== i && score >= SIMILARITY_THRESHOLD) {
        union(i, j);
      }
    }
  }

  // Step 3: group logs by their root in the union-find tree
  const clusterMap = new Map(); // root index → [log indices]
  for (let i = 0; i < logs.length; i++) {
    const root = find(i);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root).push(i);
  }

  // Step 4: shape each cluster for output
  return Array.from(clusterMap.values()).map((members, idx) => {
    const memberLogs = members.map(i => logs[i]);
    return {
      clusterId:            `c-${String(idx + 1).padStart(3, '0')}`,
      representativeMessage: memberLogs[0].message,  // first = cluster seed
      memberCount:          members.length,
      levels:               [...new Set(memberLogs.map(l => l.level))],
      traceIds:             memberLogs.map(l => l.traceId).filter(Boolean),
      firstSeen:            memberLogs.at(0).timestamp,
      lastSeen:             memberLogs.at(-1).timestamp,
    };
  });
}

export { clusterBySimilarity, SIMILARITY_THRESHOLD };
```

---

## Grouping by Service

```js
// services/logAnalysis/groupByService.js

/**
 * Groups clusters and raw log counts by service name.
 *
 * Input:  all normalised logs + all clusters
 * Output: { [serviceName]: { logCount, errorCount, errorRate, clusters[] } }
 */
function groupByService(logs, clusters) {
  const ERROR_LEVELS = new Set(['ERROR', 'FATAL']);

  // Build a lookup: message → cluster (for attaching clusters to services)
  const messageToCluster = new Map();
  for (const cluster of clusters) {
    messageToCluster.set(cluster.representativeMessage, cluster);
  }

  // Bucket logs by service
  const serviceMap = new Map();

  for (const log of logs) {
    if (!serviceMap.has(log.service)) {
      serviceMap.set(log.service, { logs: [], clusters: new Set() });
    }
    const bucket = serviceMap.get(log.service);
    bucket.logs.push(log);

    const cluster = messageToCluster.get(log.message);
    if (cluster) bucket.clusters.add(cluster);
  }

  // Shape output
  const result = {};
  for (const [service, { logs: serviceLogs, clusters: serviceClusters }] of serviceMap) {
    const errorCount = serviceLogs.filter(l => ERROR_LEVELS.has(l.level)).length;
    result[service] = {
      logCount:   serviceLogs.length,
      errorCount,
      errorRate:  Number((errorCount / serviceLogs.length).toFixed(2)),
      clusters:   [...serviceClusters],
    };
  }

  return result;
}

export { groupByService };
```

---

## Grouping by Time Period

Time windows are **1-minute tumbling windows** (configurable). A window is flagged as a
spike when its error rate is more than 2× the batch-wide average error rate.

```js
// services/logAnalysis/groupByTimePeriod.js

const WINDOW_MINUTES = 1; // configurable

/**
 * Buckets logs into fixed 1-minute tumbling windows.
 * Computes errorRate per window and flags spikes.
 *
 * Input:  normalised logs (sorted by timestamp), batch-level errorRate
 * Output: { [windowKey]: { windowStart, windowEnd, logCount, errorCount,
 *                          errorRate, spikeDetected, services[] } }
 */
function groupByTimePeriod(logs, batchErrorRate) {
  const WINDOW_MS   = WINDOW_MINUTES * 60 * 1000;
  const ERROR_LEVELS = new Set(['ERROR', 'FATAL']);

  const windowMap = new Map(); // windowStart (ms) → bucket

  for (const log of logs) {
    const ts          = new Date(log.timestamp).getTime();
    const windowStart = Math.floor(ts / WINDOW_MS) * WINDOW_MS;

    if (!windowMap.has(windowStart)) {
      windowMap.set(windowStart, { logs: [], services: new Set() });
    }
    const bucket = windowMap.get(windowStart);
    bucket.logs.push(log);
    bucket.services.add(log.service);
  }

  const result = {};
  for (const [windowStart, { logs: windowLogs, services }] of windowMap) {
    const windowEnd  = new Date(windowStart + WINDOW_MS).toISOString();
    const windowKey  = `${new Date(windowStart).toISOString()}/${windowEnd}`;
    const errorCount = windowLogs.filter(l => ERROR_LEVELS.has(l.level)).length;
    const errorRate  = Number((errorCount / windowLogs.length).toFixed(2));

    result[windowKey] = {
      windowStart:    new Date(windowStart).toISOString(),
      windowEnd,
      logCount:       windowLogs.length,
      errorCount,
      errorRate,
      spikeDetected:  errorRate > 2 * batchErrorRate,  // 2× batch average = spike
      services:       [...services],
    };
  }

  return result;
}

export { groupByTimePeriod, WINDOW_MINUTES };
```

---

## Anomaly Detection

An anomaly is recorded when:

| Type | Condition |
|---|---|
| `error_spike` | A 1-min window's errorRate > 2× the batch average |
| `fatal_burst` | ≥ 3 FATAL logs within any 1-min window |
| `single_service_dominance` | One service accounts for > 80% of all errors |

```js
// services/logAnalysis/anomalyDetector.js

function detectAnomalies(logs, byTimePeriod, byService, batchErrorRate) {
  const anomalies = [];

  // 1. Error spikes per time window
  for (const [key, window] of Object.entries(byTimePeriod)) {
    if (window.spikeDetected) {
      anomalies.push({
        type:        'error_spike',
        services:    window.services,
        windowStart: window.windowStart,
        windowEnd:   window.windowEnd,
        detail:      `Error rate ${(window.errorRate * 100).toFixed(0)}% vs batch average ${(batchErrorRate * 100).toFixed(0)}%`,
      });
    }
  }

  // 2. Fatal bursts per time window
  for (const [key, window] of Object.entries(byTimePeriod)) {
    const fatals = window.logCount > 0
      ? logs.filter(l =>
          l.level === 'FATAL' &&
          new Date(l.timestamp) >= new Date(window.windowStart) &&
          new Date(l.timestamp) < new Date(window.windowEnd)
        ).length
      : 0;
    if (fatals >= 3) {
      anomalies.push({
        type:        'fatal_burst',
        services:    window.services,
        windowStart: window.windowStart,
        windowEnd:   window.windowEnd,
        detail:      `${fatals} FATAL logs within 1-minute window`,
      });
    }
  }

  // 3. Single-service error dominance
  const totalErrors = logs.filter(l => ['ERROR', 'FATAL'].includes(l.level)).length;
  for (const [service, stats] of Object.entries(byService)) {
    if (totalErrors > 0 && stats.errorCount / totalErrors > 0.8) {
      anomalies.push({
        type:    'single_service_dominance',
        service,
        detail:  `${service} accounts for ${((stats.errorCount / totalErrors) * 100).toFixed(0)}% of all errors`,
      });
    }
  }

  return anomalies;
}

export { detectAnomalies };
```

---

## Summary Generation

The summary is template-based (no LLM). It is designed so that an LLM provider can be
injected here via the `LLMProvider` interface defined in `services/llm/interface.js`.

```js
// services/logAnalysis/summarizer.js

/**
 * Produces a plain-English summary from analysis results.
 * Pure function — no side effects, easy to test.
 *
 * To plug in an LLM: replace this function with a call to
 *   llmProvider.analyze(buildPrompt(analysis), context)
 */
function generateSummary({ totalLogs, byService, byTimePeriod, anomalies }) {
  const serviceNames   = Object.keys(byService).join(', ');
  const errorServices  = Object.entries(byService)
    .filter(([, s]) => s.errorCount > 0)
    .map(([name, s]) => `${name} (${s.errorCount} errors)`)
    .join(', ');

  const spikeWindows   = Object.values(byTimePeriod)
    .filter(w => w.spikeDetected)
    .map(w => `${w.windowStart}–${w.windowEnd}`)
    .join(', ');

  const totalErrors    = Object.values(byService).reduce((sum, s) => sum + s.errorCount, 0);
  const anomalySummary = anomalies.length
    ? `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected (${anomalies.map(a => a.type).join(', ')}).`
    : 'No anomalies detected.';

  return [
    `Analysed ${totalLogs} log entries across ${Object.keys(byService).length} service(s): ${serviceNames}.`,
    totalErrors > 0
      ? `${totalErrors} error(s) found: ${errorServices}.`
      : 'No errors found.',
    spikeWindows
      ? `Error rate spikes detected in window(s): ${spikeWindows}.`
      : '',
    anomalySummary,
  ].filter(Boolean).join(' ');
}

export { generateSummary };
```

---

## File Structure

```
src/
  routes/
    logs.js                        # POST /api/v1/logs/analyze — thin router
  controllers/
    logsController.js              # parse req → call service → send res
  services/
    logAnalysis/
      index.js                     # orchestrator — calls steps in order
      validator.js                 # validate & normalise incoming logs
      embedder.js                  # LangChain FakeEmbeddings + MemoryVectorStore
      clusterer.js                 # similarity scoring + union-find clustering
      groupByService.js            # group clusters by service
      groupByTimePeriod.js         # tumbling window grouping + spike detection
      anomalyDetector.js           # anomaly rules
      summarizer.js                # template-based summary (LLM plug-in point)
  data/
    sampleLogs.js                  # seed log batches (realistic trading platform patterns)
```

---

## Orchestrator (index.js — the readable entry point)

```js
// services/logAnalysis/index.js

import { validateAndNormalize }  from './validator.js';
import { buildVectorStore }      from './embedder.js';
import { clusterBySimilarity }   from './clusterer.js';
import { groupByService }        from './groupByService.js';
import { groupByTimePeriod }     from './groupByTimePeriod.js';
import { detectAnomalies }       from './anomalyDetector.js';
import { generateSummary }       from './summarizer.js';

/**
 * analyzeLogs — main entry point for log analysis.
 *
 * The steps are intentionally sequential and named so that
 * you can follow the data transformation at a glance.
 */
async function analyzeLogs(rawLogs) {
  // 1. Validate input and normalise fields
  const logs = validateAndNormalize(rawLogs);

  // 2. Embed log messages into an in-memory vector store
  const vectorStore = await buildVectorStore(logs);

  // 3. Cluster logs by semantic similarity (cosine distance on embeddings)
  const clusters = await clusterBySimilarity(logs, vectorStore);

  // 4. Group by service — counts, error rates, and which clusters belong where
  const byService = groupByService(logs, clusters);

  // 5. Compute batch-level error rate (used as baseline for spike detection)
  const totalErrors    = logs.filter(l => ['ERROR', 'FATAL'].includes(l.level)).length;
  const batchErrorRate = logs.length > 0 ? totalErrors / logs.length : 0;

  // 6. Group by 1-minute tumbling time windows, flag spikes
  const byTimePeriod = groupByTimePeriod(logs, batchErrorRate);

  // 7. Detect anomalies across services and time windows
  const anomalies = detectAnomalies(logs, byTimePeriod, byService, batchErrorRate);

  // 8. Generate a human-readable summary (template-based; LLM plug-in point)
  const summary = generateSummary({ totalLogs: logs.length, byService, byTimePeriod, anomalies });

  return {
    totalLogs:   logs.length,
    analyzedAt:  new Date().toISOString(),
    byService,
    byTimePeriod,
    anomalies,
    summary,
  };
}

export { analyzeLogs };
```

---

## Dependencies to Add

```json
{
  "langchain": "^0.3.0",
  "@langchain/core": "^0.3.0"
}
```

No API keys required. `FakeEmbeddings` is fully self-contained.

---

## Testing Requirements

| Test | What to assert |
|---|---|
| Validation | Rejects missing `level`, bad timestamp, empty `message`; passes valid batch |
| Embedding + store | `buildVectorStore` returns a store; similarity search returns results |
| Clustering | Two identical messages → same cluster; two unrelated messages → different clusters |
| Score threshold | Pair with score 0.90 clusters together; pair with score 0.50 does not |
| groupByService | Each service key has correct `logCount`, `errorCount`, `errorRate` |
| groupByTimePeriod | Logs in same minute → same window; spike flag fires when errorRate > 2× average |
| detectAnomalies | `error_spike` fires on spiked window; `fatal_burst` fires on 3+ FATALs |
| generateSummary | Returns a non-empty string; mentions service names and error count |
| POST /api/v1/logs/analyze | 200 with valid batch; 422 with invalid entry; correct shape |

---

## LLM Extensibility Note

The `summarizer.js` module is the sole LLM plug-in point for this capability. To upgrade:

```js
// Drop-in replacement inside summarizer.js
import { llmProvider } from '../llm/index.js';

async function generateSummary(analysis) {
  const prompt = buildPrompt(analysis);   // format analysis as a prompt string
  return llmProvider.analyze(prompt, analysis);
}
```

No other module needs to change. The clustering, grouping, and anomaly detection remain
fully deterministic regardless of which LLM (or no LLM) is used.

---

## Local RAG System

### Why RAG here

The assignment criteria require:
- No real LLM API calls — deterministic mock implementations only
- In-memory only — no persistence layer
- System designed so an LLM *could* be plugged in later
- Simple, legible control flow

A local RAG (Retrieval-Augmented Generation) system satisfies all four. It uses the
**same `MemoryVectorStore`** already built for log clustering — no new infrastructure.
When a log batch arrives, the RAG pipeline retrieves the most relevant **historical
incidents** from the store and injects them as context into the summary generator.
The generator is a deterministic mock today; a real LLM drops in at that single point.

```
Incoming log batch
       │
       ▼
  [Existing pipeline]
  validate → embed → cluster → group → anomalies
       │
       ▼
  RAG RETRIEVAL ─── query KnowledgeStore with cluster representative messages
       │                 (same MemoryVectorStore, seeded with historical incidents)
       ▼
  TOP-K CONTEXT ─── ranked historical incidents + their root causes / resolutions
       │
       ▼
  MOCK LLM ──────── MockLLMProvider receives: { analysis, retrievedContext }
       │             returns deterministic summary built from templates + retrieved facts
       ▼
  AUGMENTED SUMMARY returned in response
```

---

### Knowledge Store — seeding historical incidents

The RAG system uses a **separate** `MemoryVectorStore` instance called the
`KnowledgeStore`. It is seeded once at application startup from `src/data/incidents.js`.

Each historical incident is stored as a LangChain `Document`:

```js
// services/rag/knowledgeStore.js

import { FakeEmbeddings }    from '@langchain/core/utils/testing';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document }          from 'langchain/schema';
import { getHistoricalIncidents } from '../../data/incidents.js';

let _knowledgeStore = null; // module-level singleton — in-memory, lives for process lifetime

/**
 * Builds the knowledge store once and caches it.
 * Called during app startup (main.js → initKnowledgeStore()).
 *
 * Each incident is embedded by its title + description so that
 * similarity search finds incidents matching the current log patterns.
 */
async function initKnowledgeStore() {
  const incidents  = getHistoricalIncidents();
  const embeddings = new FakeEmbeddings();

  const documents = incidents.map(incident =>
    new Document({
      // What gets embedded — the text used for similarity matching
      pageContent: `${incident.title}. ${incident.description}`,

      // What gets returned — the full incident record for context injection
      metadata: {
        id:               incident.id,
        title:            incident.title,
        affectedServices: incident.affectedServices,
        severity:         incident.severity,
        rootCause:        incident.rootCause,
        resolution:       incident.resolution,
        resolvedInMin:    incident.resolvedInMin,
      },
    })
  );

  _knowledgeStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
  return _knowledgeStore;
}

/**
 * Returns the singleton knowledge store.
 * Throws if initKnowledgeStore() was not called at startup.
 */
function getKnowledgeStore() {
  if (!_knowledgeStore) throw new Error('KnowledgeStore not initialised — call initKnowledgeStore() at startup');
  return _knowledgeStore;
}

export { initKnowledgeStore, getKnowledgeStore };
```

---

### RAG Retriever — fetching relevant context

```js
// services/rag/retriever.js

import { getKnowledgeStore } from './knowledgeStore.js';

const TOP_K = 3; // number of historical incidents to retrieve per query

/**
 * Retrieves the top-K most relevant historical incidents for a given query.
 *
 * Query = the representative message of a log cluster.
 * The knowledge store returns incidents whose title+description is most
 * semantically similar to that message.
 *
 * Returns: Array of { incident (metadata), similarityScore }
 */
async function retrieveRelevantIncidents(query) {
  const store   = getKnowledgeStore();
  const results = await store.similaritySearchWithScore(query, TOP_K);

  return results.map(([doc, score]) => ({
    similarityScore: Number(score.toFixed(3)),
    incident:        doc.metadata,
  }));
}

/**
 * Runs retrieval for every cluster representative in the analysis.
 * De-duplicates incidents that appear across multiple clusters.
 *
 * Returns: Array of unique retrieved incidents, sorted by score descending.
 */
async function retrieveContextForAnalysis(clusters) {
  const seen    = new Set();
  const context = [];

  for (const cluster of clusters) {
    const results = await retrieveRelevantIncidents(cluster.representativeMessage);

    for (const result of results) {
      if (!seen.has(result.incident.id)) {
        seen.add(result.incident.id);
        context.push(result);
      }
    }
  }

  // Sort by similarity score — most relevant first
  return context.sort((a, b) => b.similarityScore - a.similarityScore);
}

export { retrieveContextForAnalysis, retrieveRelevantIncidents, TOP_K };
```

---

### Mock LLM Provider — deterministic, no API key

Satisfies the assignment criterion: *"use deterministic mock/stub implementations that
simulate AI behavior (pattern matching, keyword extraction, etc.)"*

The `MockLLMProvider` builds its response from:
1. The structured analysis (clusters, anomalies, service stats)
2. The retrieved historical incidents (root causes, resolutions)

```js
// services/llm/MockLLMProvider.js

import { LLMProvider } from './interface.js';

/**
 * MockLLMProvider — no API calls, fully deterministic.
 *
 * Simulates LLM behaviour by:
 *   1. Extracting key signals from the analysis (highest error service, spike windows)
 *   2. Injecting retrieved historical context (past root causes, resolutions)
 *   3. Assembling a structured summary string
 *
 * A real provider (OpenAILLMProvider, AnthropicLLMProvider) implements the same
 * interface and replaces this class with zero changes to calling code.
 */
export class MockLLMProvider extends LLMProvider {

  /**
   * @param {object} analysis  — output of the log analysis pipeline
   * @param {Array}  context   — retrieved historical incidents from RAG retriever
   * @returns {string}          augmented summary
   */
  async analyze(analysis, context = []) {
    const { byService, byTimePeriod, anomalies, totalLogs } = analysis;

    // --- Signal extraction (keyword / pattern matching) ---

    const worstService = this._findWorstService(byService);
    const spikeWindows = this._findSpikeWindows(byTimePeriod);
    const anomalyText  = anomalies.length
      ? `Anomalies: ${anomalies.map(a => a.detail).join('; ')}.`
      : 'No anomalies flagged.';

    // --- Context injection from retrieved incidents ---

    const contextText = context.length
      ? this._formatRetrievedContext(context)
      : 'No similar historical incidents found.';

    // --- Assemble deterministic summary ---

    return [
      `Analysed ${totalLogs} log entries.`,
      worstService
        ? `Highest error rate: ${worstService.name} (${(worstService.errorRate * 100).toFixed(0)}% errors).`
        : '',
      spikeWindows.length
        ? `Error spike(s) detected at: ${spikeWindows.join(', ')}.`
        : '',
      anomalyText,
      '',
      '--- Historical Context (RAG) ---',
      contextText,
    ].filter(s => s !== undefined).join('\n');
  }

  // --- Private helpers (pattern matching / extraction) ---

  _findWorstService(byService) {
    const entries = Object.entries(byService).filter(([, s]) => s.errorCount > 0);
    if (!entries.length) return null;
    const [name, stats] = entries.sort(([, a], [, b]) => b.errorRate - a.errorRate)[0];
    return { name, ...stats };
  }

  _findSpikeWindows(byTimePeriod) {
    return Object.values(byTimePeriod)
      .filter(w => w.spikeDetected)
      .map(w => w.windowStart);
  }

  _formatRetrievedContext(context) {
    return context.map(({ incident, similarityScore }, i) =>
      [
        `[${i + 1}] ${incident.title} (similarity: ${similarityScore})`,
        `    Root cause:  ${incident.rootCause}`,
        `    Resolution:  ${incident.resolution}`,
        `    Resolved in: ${incident.resolvedInMin} min`,
      ].join('\n')
    ).join('\n');
  }
}
```

---

### LLM Provider Interface

```js
// services/llm/interface.js

/**
 * LLMProvider — base interface for all LLM integrations.
 *
 * To add a real provider:
 *   1. Extend this class
 *   2. Implement analyze(analysis, context)
 *   3. Swap it in via src/config.js (LLM_PROVIDER env var)
 */
export class LLMProvider {
  /**
   * @param {object} analysis  — structured analysis from the log pipeline
   * @param {Array}  context   — retrieved documents from RAG knowledge store
   * @returns {Promise<string>} human-readable summary
   */
  async analyze(analysis, context) {
    throw new Error(`${this.constructor.name} must implement analyze()`);
  }
}
```

---

### RAG-Augmented Orchestrator (updated index.js)

The orchestrator gains two new steps — retrieval and LLM summarisation — while
keeping the same readable step-by-step structure:

```js
// services/logAnalysis/index.js  (updated)

import { validateAndNormalize }      from './validator.js';
import { buildVectorStore }          from './embedder.js';
import { clusterBySimilarity }       from './clusterer.js';
import { groupByService }            from './groupByService.js';
import { groupByTimePeriod }         from './groupByTimePeriod.js';
import { detectAnomalies }           from './anomalyDetector.js';
import { retrieveContextForAnalysis } from '../rag/retriever.js';
import { getLLMProvider }            from '../llm/index.js';

async function analyzeLogs(rawLogs) {
  // 1. Validate and normalise
  const logs = validateAndNormalize(rawLogs);

  // 2. Embed log messages into a per-request in-memory vector store
  const vectorStore = await buildVectorStore(logs);

  // 3. Cluster by semantic similarity
  const clusters = await clusterBySimilarity(logs, vectorStore);

  // 4. Group by service
  const byService = groupByService(logs, clusters);

  // 5. Compute batch error rate baseline
  const totalErrors    = logs.filter(l => ['ERROR', 'FATAL'].includes(l.level)).length;
  const batchErrorRate = logs.length > 0 ? totalErrors / logs.length : 0;

  // 6. Group by 1-minute time windows, flag spikes
  const byTimePeriod = groupByTimePeriod(logs, batchErrorRate);

  // 7. Detect anomalies
  const anomalies = detectAnomalies(logs, byTimePeriod, byService, batchErrorRate);

  // 8. RAG — retrieve relevant historical incidents from the knowledge store
  const retrievedContext = await retrieveContextForAnalysis(clusters);

  // 9. Mock LLM — generate augmented summary using analysis + retrieved context
  const llm     = getLLMProvider();
  const summary = await llm.analyze(
    { totalLogs: logs.length, byService, byTimePeriod, anomalies },
    retrievedContext
  );

  return {
    totalLogs:        logs.length,
    analyzedAt:       new Date().toISOString(),
    byService,
    byTimePeriod,
    anomalies,
    retrievedContext, // expose so callers can see what historical incidents were matched
    summary,
  };
}

export { analyzeLogs };
```

---

### LLM Provider Factory

```js
// services/llm/index.js

import { MockLLMProvider }      from './MockLLMProvider.js';
// import { OpenAILLMProvider } from './OpenAILLMProvider.js';  // real provider — drop in here

/**
 * Returns the configured LLM provider.
 * Swap LLM_PROVIDER env var to switch implementations with no code changes.
 */
function getLLMProvider() {
  const provider = process.env.LLM_PROVIDER ?? 'mock';

  switch (provider) {
    case 'mock':    return new MockLLMProvider();
    // case 'openai':  return new OpenAILLMProvider();
    default:        throw new Error(`Unknown LLM_PROVIDER: "${provider}"`);
  }
}

export { getLLMProvider };
```

---

### Updated File Structure

```
src/
  services/
    logAnalysis/
      index.js             # orchestrator — 9 readable steps
      validator.js
      embedder.js          # per-request MemoryVectorStore (log clustering)
      clusterer.js
      groupByService.js
      groupByTimePeriod.js
      anomalyDetector.js
    rag/
      knowledgeStore.js    # singleton MemoryVectorStore seeded from incidents.js
      retriever.js         # retrieves top-K historical incidents per cluster
    llm/
      interface.js         # LLMProvider base class
      index.js             # factory — reads LLM_PROVIDER env var
      MockLLMProvider.js   # deterministic mock (pattern matching + template)
  data/
    incidents.js           # historical seed incidents (10+ trading platform scenarios)
    sampleLogs.js          # seed log batches
```

---

### Two Vector Stores — clear separation

| Store | Lives in | Seeded from | Purpose |
|---|---|---|---|
| **LogVectorStore** | per-request (discarded after response) | incoming log batch | cluster log messages by similarity |
| **KnowledgeStore** | process lifetime (singleton) | `incidents.js` at startup | RAG retrieval of historical incidents |

Both use `MemoryVectorStore` + `FakeEmbeddings`. No database, no API keys.

---

### RAG Testing Requirements

| Test | What to assert |
|---|---|
| `initKnowledgeStore` | Store is built; calling twice returns the same instance |
| `retrieveRelevantIncidents` | Returns ≤ TOP_K results; results have `similarityScore` and `incident` |
| De-duplication | Same incident matched by two clusters appears only once in context |
| `MockLLMProvider.analyze` | Returns a non-empty string; includes `--- Historical Context (RAG) ---` section |
| Context injection | When context is empty, summary says "No similar historical incidents found" |
| Provider factory | `LLM_PROVIDER=mock` returns `MockLLMProvider`; unknown value throws |
| End-to-end | POST /api/v1/logs/analyze response includes `retrievedContext` array |

---

### Performance Profile & Improvement Ideas

**Current profile (mock, in-memory):**
- Embedding: O(n) — one `FakeEmbeddings` call per log
- Clustering: O(n × k) — n similarity searches, each O(k) against the store
- Retrieval: O(c × k) — c cluster queries against the knowledge store

**If swapped to real embeddings (e.g., OpenAI):**
- Bottleneck shifts to network I/O for embedding calls
- Fix: batch embed all logs in a single API call (`embedDocuments([...])`)

**At scale:**
- Replace `MemoryVectorStore` with a persistent vector DB (Pinecone, Weaviate, pgvector)
- Add an embedding cache keyed on `hash(message)` — identical log lines share one embedding
- Pre-cluster the knowledge store offline; at query time, only search the relevant centroid's neighbourhood
