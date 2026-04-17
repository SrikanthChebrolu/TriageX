const SEVERITY_WEIGHTS   = { CRITICAL: 30, HIGH: 22, MEDIUM: 12, LOW: 5 };
const MARKET_START_HOUR  = 8;   // UTC
const MARKET_END_HOUR    = 17;  // UTC

/**
 * computePriorityScore — composite 0–100 score across 4 independent signals.
 *
 * Signals:
 *  - Severity weight          (max 30)
 *  - Affected services count  (max 25, +7 per service)
 *  - Similarity to past high-impact incidents (max 30)
 *  - Time of day (market hours vs off-hours)    (max 15)
 */
export function computePriorityScore(incident, topSimilarityScore) {
  const severityScore         = scoreBySeverity(incident.severity);
  const affectedServicesScore = scoreByAffectedServices(incident.affectedServices);
  const similarityScore       = scoreBySimilarity(topSimilarityScore);
  const timeOfDayScore        = scoreByTimeOfDay(new Date());

  const total = Math.min(severityScore + affectedServicesScore + similarityScore + timeOfDayScore, 100);
  return { severityScore, affectedServicesScore, similarityScore, timeOfDayScore, total };
}

export function scoreBySeverity(severity)           { return SEVERITY_WEIGHTS[severity] ?? 0; }
export function scoreByAffectedServices(services)   { return Math.min(services.length * 7, 25); }
export function scoreBySimilarity(topScore)         { return Math.round(topScore * 30); }
export function scoreByTimeOfDay(now) {
  const h = now.getUTCHours();
  return (h >= MARKET_START_HOUR && h < MARKET_END_HOUR) ? 15 : 5;
}

/** Maps a numeric total to a priority band label. */
export function scoreToPriorityBand(total) {
  if (total >= 80) return 'P1';
  if (total >= 60) return 'P2';
  if (total >= 40) return 'P3';
  return 'P4';
}
