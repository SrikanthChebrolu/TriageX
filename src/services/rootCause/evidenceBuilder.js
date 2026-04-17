/**
 * evidenceBuilder — assembles a human-readable evidence list from the three signals.
 *
 * Each evidence item has:
 *  - source:      which signal produced this piece of evidence
 *  - description: one-sentence explanation for the engineer
 *  - strength:    HIGH | MEDIUM | LOW
 */
export function buildEvidence(signals, incident, alertAnalysis = null) {
  const { patternMatches, alertSignal, historicalSignal } = signals;
  const evidence = [];

  // ── Signal 1: Pattern matching ─────────────────────────────────────────
  if (patternMatches.length > 0) {
    const top = patternMatches[0];
    evidence.push({
      source:      'pattern_matching',
      description: `Incident text matched the "${top.patternId}" pattern (${top.matchCount} keyword hits) in the "${top.failureDomain}" failure domain.`,
      strength:    top.matchCount >= 3 ? 'HIGH' : top.matchCount === 2 ? 'MEDIUM' : 'LOW',
    });

    if (patternMatches.length > 1) {
      const secondary = patternMatches.slice(1).map(p => p.failureDomain).join(', ');
      evidence.push({
        source:      'pattern_matching',
        description: `Secondary patterns also matched: ${secondary}. Consider these as contributing factors.`,
        strength:    'LOW',
      });
    }
  }

  // ── Signal 2: Alert / log-level correlation ────────────────────────────
  const { levelCounts, errorRate, affectedServices, correlationLabel } = alertSignal;
  if (levelCounts.ERROR > 0 || levelCounts.WARN > 0) {
    evidence.push({
      source:      'log_correlation',
      description: `Log analysis found ${levelCounts.ERROR} ERROR and ${levelCounts.WARN} WARN entries (${errorRate}% error rate) across ${affectedServices} affected service(s). Alert correlation strength: ${correlationLabel}.`,
      strength:    correlationLabel,
    });
  } else if (incident.logs.length === 0) {
    evidence.push({
      source:      'log_correlation',
      description: `No logs provided. Severity "${incident.severity}" and ${affectedServices} affected service(s) used as proxy for alert correlation.`,
      strength:    'LOW',
    });
  }

  // ── Signal 3: Historical similarity ───────────────────────────────────
  if (historicalSignal.topMatch) {
    const { id, title, rootCause, resolution, resolvedInMin, similarityScore } = historicalSignal.topMatch;
    const pct = Math.round(similarityScore * 100);
    evidence.push({
      source:      'historical_similarity',
      description: `Most similar past incident: "${title}" (ID: ${id}, ${pct}% match). Root cause was: ${rootCause}. Resolved in ${resolvedInMin} min by: ${resolution}.`,
      strength:    pct >= 70 ? 'HIGH' : pct >= 45 ? 'MEDIUM' : 'LOW',
    });
  } else {
    evidence.push({
      source:      'historical_similarity',
      description: 'No closely matching historical incidents found. This may be a novel failure mode.',
      strength:    'LOW',
    });
  }

  // ── Signal 4: Alert evidence (only when alerts provided) ──────────────
  if (alertAnalysis) {
    const { alertCount, serviceOverlap, dominantAlert, alertScore } = alertAnalysis;

    // Overall alert signal
    evidence.push({
      source:      'alert_correlation',
      description: `${alertCount} alert(s) fired. Dominant: "${dominantAlert.alertName}" (${dominantAlert.severity}) on ${dominantAlert.service}. Alert signal adds ${alertScore} confidence pts.`,
      strength:    dominantAlert.severity === 'CRITICAL' ? 'HIGH' : dominantAlert.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
    });

    // Service overlap is the strongest alert signal
    if (serviceOverlap.length > 0) {
      evidence.push({
        source:      'alert_correlation',
        description: `Service overlap (alerts + error logs) confirmed on: ${serviceOverlap.join(', ')}. These services are in the confirmed failure path.`,
        strength:    'HIGH',
      });
    }

    // Alert pattern reinforcement
    if (alertAnalysis.alertPatternMatches.length > 0) {
      const top = alertAnalysis.alertPatternMatches[0];
      evidence.push({
        source:      'alert_correlation',
        description: `Alert names/descriptions reinforce the "${top.failureDomain}" pattern (${top.matchCount} keyword matches in alert data).`,
        strength:    top.matchCount >= 2 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  return evidence;
}
