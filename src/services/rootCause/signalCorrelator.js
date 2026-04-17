import { ROOT_CAUSE_PATTERNS } from './rootCausePatterns.js';

/**
 * correlateSignals — runs the three independent evidence signals.
 *
 * Signal 1 — Pattern matching (incident text + log messages → root cause patterns)
 * Signal 2 — Alert correlation (log-level counts vs. affected service count)
 * Signal 3 — Historical similarity (top similar incident from KnowledgeStore RAG)
 *
 * @param {object} incident   — validated incident object (title, description, severity, logs)
 * @param {Array}  similar    — top-K results from retrieveRelevantIncidents
 * @returns {{ patternMatches, alertSignal, historicalSignal }}
 */
export function correlateSignals(incident, similar) {
  const patternMatches  = matchPatterns(incident);
  const alertSignal     = buildAlertSignal(incident);
  const historicalSignal = buildHistoricalSignal(similar);

  return { patternMatches, alertSignal, historicalSignal };
}

// ---------------------------------------------------------------------------
// Signal 1 — Pattern matching
// ---------------------------------------------------------------------------

function matchPatterns(incident) {
  const text = buildSearchText(incident);

  const scored = ROOT_CAUSE_PATTERNS
    .map(pattern => ({
      pattern,
      matchCount: pattern.keywords.filter(kw => text.includes(kw)).length,
    }))
    .filter(({ matchCount }) => matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);

  return scored.slice(0, 3).map(({ pattern, matchCount }) => ({
    patternId:     pattern.id,
    failureDomain: pattern.failureDomain,
    hypothesis:    pattern.hypothesis,
    nextSteps:     pattern.nextSteps,
    remediation:   pattern.remediation,
    matchCount,
  }));
}

function buildSearchText(incident) {
  const logMessages = incident.logs.map(l => l.message).join(' ');
  return `${incident.title} ${incident.description} ${logMessages}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// Signal 2 — Alert / log-level correlation
// ---------------------------------------------------------------------------

function buildAlertSignal(incident) {
  const levelCounts = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
  for (const log of incident.logs) {
    const level = log.level?.toUpperCase() ?? 'INFO';
    levelCounts[level] = (levelCounts[level] ?? 0) + 1;
  }

  const errorRate = incident.logs.length > 0
    ? levelCounts.ERROR / incident.logs.length
    : 0;

  // Severity boost: CRITICAL/HIGH incidents imply real alert, even with no logs
  const severityBoost = { CRITICAL: 1.0, HIGH: 0.8, MEDIUM: 0.5, LOW: 0.2 };
  const baseSeverity  = severityBoost[incident.severity] ?? 0.2;

  // Combine error rate in logs with severity signal
  const correlation = Math.min((errorRate * 0.6) + (baseSeverity * 0.4), 1.0);

  return {
    levelCounts,
    errorRate:          Math.round(errorRate * 100),       // percentage
    affectedServices:   incident.affectedServices.length,
    correlation:        Math.round(correlation * 100) / 100,
    correlationLabel:   labelCorrelation(correlation),
  };
}

function labelCorrelation(c) {
  if (c >= 0.75) return 'HIGH';
  if (c >= 0.45) return 'MEDIUM';
  return 'LOW';
}

// ---------------------------------------------------------------------------
// Signal 3 — Historical similarity from RAG
// ---------------------------------------------------------------------------

function buildHistoricalSignal(similar) {
  if (!similar || similar.length === 0) {
    return { topMatch: null, avgSimilarity: 0 };
  }

  const topMatch = similar[0];
  const avgSimilarity = similar.reduce((sum, s) => sum + s.similarityScore, 0) / similar.length;

  return {
    topMatch: {
      id:             topMatch.incident.id,
      title:          topMatch.incident.title,
      rootCause:      topMatch.incident.rootCause,
      resolution:     topMatch.incident.resolution,
      resolvedInMin:  topMatch.incident.resolvedInMin,
      similarityScore: topMatch.similarityScore,
    },
    avgSimilarity: Math.round(avgSimilarity * 100) / 100,
  };
}
