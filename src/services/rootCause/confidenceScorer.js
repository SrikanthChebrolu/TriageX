/**
 * confidenceScorer — composite 0–100 confidence score from three independent signals,
 * with an optional alert bonus when alerts are provided.
 *
 * Base scoring (max 85 without alerts):
 *  - logCorrelation       (max 30): log error-rate × severity weight
 *  - serviceCorrelation   (max 25): affected service count
 *  - historicalSimilarity (max 30): vector similarity to known past incidents
 *  - convergenceBonus     (max 15): bonus when pattern + historical agree on domain
 *
 * Alert bonus (max 20 additional — total cap remains 100):
 *  - alertScore: fired alerts contribute extra confidence when present
 */
export function computeConfidenceScore(signals, alertAnalysis = null) {
  const { patternMatches, alertSignal, historicalSignal } = signals;

  const logCorrelation        = scoreLogCorrelation(alertSignal);
  const serviceCorrelation    = scoreServiceCorrelation(alertSignal);
  const historicalSimilarity  = scoreHistoricalSimilarity(historicalSignal);
  const convergenceBonus      = scoreConvergenceBonus(patternMatches, historicalSignal);
  const alertBonus            = alertAnalysis?.alertScore ?? 0;

  const total = Math.min(
    logCorrelation + serviceCorrelation + historicalSimilarity + convergenceBonus + alertBonus,
    100
  );

  return {
    logCorrelation,
    serviceCorrelation,
    historicalSimilarity,
    convergenceBonus,
    alertBonus,
    total,
    band:         scoreToBand(total),
    alertsUsed:   alertAnalysis !== null,
  };
}

// ---------------------------------------------------------------------------
// Sub-scorers
// ---------------------------------------------------------------------------

/** Log error rate and severity drive this signal (max 30). */
function scoreLogCorrelation(alertSignal) {
  return Math.round(alertSignal.correlation * 30);
}

/** More affected services → higher confidence this is a real, broad incident (max 25). */
function scoreServiceCorrelation(alertSignal) {
  const serviceCount = alertSignal.affectedServices ?? 1;
  return Math.min(serviceCount * 7 + 1, 25);
}

/** How similar is the top historical incident? (max 30). */
function scoreHistoricalSimilarity(historicalSignal) {
  const topScore = historicalSignal?.topMatch?.similarityScore ?? 0;
  return Math.round(topScore * 30);
}

/**
 * Convergence bonus — awarded when pattern matching AND historical signal
 * point to the same failure domain (max 15).
 */
function scoreConvergenceBonus(patternMatches, historicalSignal) {
  if (!patternMatches || patternMatches.length === 0) return 0;
  if (!historicalSignal?.topMatch?.rootCause) return 0;

  const topPatternDomain = patternMatches[0].failureDomain.toLowerCase();
  const historicalCause  = historicalSignal.topMatch.rootCause.toLowerCase();

  const domainKeywords = topPatternDomain.split(/[\s/]+/);
  const converges = domainKeywords.some(kw => kw.length > 3 && historicalCause.includes(kw));

  return converges ? 15 : 0;
}

function scoreToBand(total) {
  if (total >= 75) return 'HIGH';
  if (total >= 50) return 'MEDIUM';
  if (total >= 25) return 'LOW';
  return 'VERY_LOW';
}
