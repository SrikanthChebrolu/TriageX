import { ROOT_CAUSE_PATTERNS } from './rootCausePatterns.js';

/**
 * analyzeAlerts — deep alert correlation when alerts are provided.
 *
 * Produces:
 *  - bySeverity:          count of alerts per severity level
 *  - byService:           count of alerts per service, flagging overlap with ERROR logs
 *  - patternMatches:      root-cause patterns whose keywords appear in alert names/descriptions
 *  - timeCorrelation:     for each alert, how close (ms) is the nearest log ERROR?
 *  - serviceOverlap:      services that have BOTH a fired alert AND an ERROR log (high signal)
 *  - alertScore:          additional confidence contribution (max 20)
 *
 * @param {Array} alerts   — normalised alert objects
 * @param {Array} logs     — normalised log objects (required alongside alerts)
 * @param {Array} patternMatches — top pattern matches from signalCorrelator
 * @returns {object} alert analysis result
 */
export function analyzeAlerts(alerts, logs, patternMatches) {
  if (!alerts || alerts.length === 0) return null;

  const bySeverity   = countBySeverity(alerts);
  const byService    = countByService(alerts);
  const errorLogs    = logs.filter(l => l.level === 'ERROR');
  const serviceOverlap = findServiceOverlap(alerts, errorLogs);
  const timeCorrelation = correlateAlertTimesToErrors(alerts, errorLogs);
  const alertPatternMatches = matchAlertPatterns(alerts);
  const alertScore  = computeAlertScore(alerts, serviceOverlap, alertPatternMatches, timeCorrelation);

  // Dominant alert: highest severity, most recent
  const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const dominantAlert = [...alerts].sort((a, b) =>
    (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0)
  )[0];

  return {
    alertCount:        alerts.length,
    bySeverity,
    byService,
    dominantAlert,
    serviceOverlap,    // services with both an alert AND an error log — highest confidence signal
    timeCorrelation,   // per-alert: how many ms to the nearest ERROR log
    alertPatternMatches, // which root-cause patterns the alerts reinforce
    alertScore,        // bonus confidence pts (max 20)
    interpretation:    buildInterpretation(alerts, serviceOverlap, alertPatternMatches, patternMatches),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countBySeverity(alerts) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const a of alerts) {
    counts[a.severity] = (counts[a.severity] ?? 0) + 1;
  }
  return counts;
}

function countByService(alerts) {
  const counts = {};
  for (const a of alerts) {
    counts[a.service] = (counts[a.service] ?? 0) + 1;
  }
  return counts;
}

/**
 * serviceOverlap — services that have BOTH a fired alert AND at least one ERROR log.
 * These are the highest-signal services for root cause identification.
 */
function findServiceOverlap(alerts, errorLogs) {
  const alertServices = new Set(alerts.map(a => a.service));
  const errorServices = new Set(errorLogs.map(l => l.service));
  return [...alertServices].filter(s => errorServices.has(s));
}

/**
 * For each alert, find the nearest ERROR log (by timestamp) and compute the delta in ms.
 * A small delta (< 30s) indicates the alert fired in direct response to the errors.
 */
function correlateAlertTimesToErrors(alerts, errorLogs) {
  return alerts.map(alert => {
    const alertTime = new Date(alert.firedAt).getTime();

    if (errorLogs.length === 0) {
      return { alertName: alert.alertName, service: alert.service, nearestErrorDeltaMs: null, nearestErrorLog: null };
    }

    let nearest = null;
    let minDelta = Infinity;
    for (const log of errorLogs) {
      const delta = Math.abs(new Date(log.timestamp).getTime() - alertTime);
      if (delta < minDelta) {
        minDelta  = delta;
        nearest   = log;
      }
    }

    return {
      alertName:          alert.alertName,
      service:            alert.service,
      nearestErrorDeltaMs: minDelta,
      nearestErrorDeltaSec: Math.round(minDelta / 1000),
      nearestErrorLog:    nearest ? `[${nearest.service}] ${nearest.message}` : null,
      strongCorrelation:  minDelta < 30_000,   // alert fired within 30 s of an ERROR log
    };
  });
}

/**
 * Match alert names/descriptions against root-cause pattern keywords.
 * Returns patterns that are reinforced by the alerts (in addition to log signal).
 */
function matchAlertPatterns(alerts) {
  const alertText = alerts.map(a => `${a.alertName} ${a.description}`).join(' ').toLowerCase();

  return ROOT_CAUSE_PATTERNS
    .filter(p => p.id !== 'unknown')
    .map(p => ({
      patternId:     p.id,
      failureDomain: p.failureDomain,
      matchCount:    p.keywords.filter(kw => alertText.includes(kw)).length,
    }))
    .filter(m => m.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 3);
}

/**
 * Alert score bonus (max 20 pts):
 *  - Each CRITICAL alert:    +5 (max 10)
 *  - Each HIGH alert:        +3 (max  6)
 *  - Service overlap:        +4 per overlapping service (max  8)
 *  - Strong time correlation: +2 per alert within 30s of an ERROR (max  6)
 */
function computeAlertScore(alerts, serviceOverlap, alertPatternMatches, timeCorrelation) {
  const severityRank = { CRITICAL: 5, HIGH: 3, MEDIUM: 1, LOW: 0 };
  const severityPts  = Math.min(alerts.reduce((s, a) => s + (severityRank[a.severity] ?? 0), 0), 10);
  const overlapPts   = Math.min(serviceOverlap.length * 4, 8);
  const timePts      = Math.min(timeCorrelation.filter(t => t.strongCorrelation).length * 2, 6);
  return Math.min(severityPts + overlapPts + timePts, 20);
}

/**
 * Plain-English interpretation of the alert signal for the engineer.
 */
function buildInterpretation(alerts, serviceOverlap, alertPatternMatches, patternMatches) {
  const parts = [];

  if (serviceOverlap.length > 0) {
    parts.push(
      `High-confidence signal: ${serviceOverlap.join(', ')} has both fired alerts AND error logs — ` +
      `these services are almost certainly in the failure path.`
    );
  }

  if (alertPatternMatches.length > 0 && patternMatches.length > 0) {
    const alertDomain = alertPatternMatches[0].failureDomain;
    const logDomain   = patternMatches[0]?.failureDomain ?? '';
    if (alertDomain === logDomain) {
      parts.push(
        `Alert signal AGREES with log pattern matching: both point to "${alertDomain}" as the failure domain. ` +
        `This convergence significantly raises confidence.`
      );
    } else {
      parts.push(
        `Alert signal points to "${alertDomain}". ` +
        `Log pattern matching points to "${logDomain}". ` +
        `Consider both domains in your investigation.`
      );
    }
  }

  if (parts.length === 0) {
    parts.push(`${alerts.length} alert(s) received. Correlating with log evidence to refine root cause.`);
  }

  return parts.join(' ');
}
