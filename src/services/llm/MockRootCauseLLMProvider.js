import { LLMProvider } from './interface.js';

/**
 * MockRootCauseLLMProvider — deterministic root-cause summary generator.
 *
 * Includes alert signal in the summary when alerts were provided.
 *
 * TODO (future): real provider performs web search for technical error codes.
 * TODO (future): real provider looks up business error dictionary for domain codes.
 *
 * @param {{ incident, signals, confidenceScore, evidence, alertAnalysis }} analysisContext
 * @param {Array} similarIncidents — top-K from KnowledgeStore RAG
 */
export class MockRootCauseLLMProvider extends LLMProvider {
  async analyze({ incident, signals, confidenceScore, evidence, alertAnalysis }, similarIncidents = []) {
    const topPattern    = signals.patternMatches?.[0] ?? null;
    const topHistorical = signals.historicalSignal?.topMatch ?? null;
    const { band, total, alertBonus } = confidenceScore;

    const parts = [];

    // Opening: confidence + primary hypothesis
    if (topPattern) {
      parts.push(
        `Root cause identified with ${band} confidence (${total}/100): likely "${topPattern.failureDomain}" failure — ${topPattern.hypothesis}`
      );
    } else {
      parts.push(`Insufficient pattern signal (confidence ${total}/100). Manual investigation required.`);
    }

    // Alert signal (only when provided)
    if (alertAnalysis) {
      const { alertCount, serviceOverlap, dominantAlert, bySeverity } = alertAnalysis;
      const criticals = bySeverity.CRITICAL ?? 0;
      const highs     = bySeverity.HIGH ?? 0;
      parts.push(
        `Alert signal: ${alertCount} alert(s) fired (${criticals} CRITICAL, ${highs} HIGH). ` +
        `Dominant alert: "${dominantAlert.alertName}" on ${dominantAlert.service}. ` +
        (serviceOverlap.length > 0
          ? `Alert+log overlap confirmed on: ${serviceOverlap.join(', ')} — these are the confirmed failure services. `
          : '') +
        `Alert bonus: +${alertBonus} confidence pts.`
      );
    }

    // Historical comparison
    if (topHistorical) {
      const pct = Math.round(topHistorical.similarityScore * 100);
      parts.push(
        `Most similar past incident: "${topHistorical.title}" (${pct}% match). ` +
        `Previous root cause: ${topHistorical.rootCause}. ` +
        `Resolved in ${topHistorical.resolvedInMin} min via: ${topHistorical.resolution}.`
      );
    }

    // Log signal summary
    const { levelCounts, errorRate } = signals.alertSignal ?? {};
    if (levelCounts && (levelCounts.ERROR > 0 || levelCounts.WARN > 0)) {
      parts.push(
        `Log correlation: ${levelCounts.ERROR} ERROR(s) and ${levelCounts.WARN} WARN(s) ` +
        `(${errorRate}% error rate across ${incident.affectedServices.length} service(s)).`
      );
    }

    // Immediate action
    if (topPattern?.nextSteps?.length > 0) {
      parts.push(`Immediate action: ${topPattern.nextSteps[0]}`);
    }

    return parts.filter(Boolean).join(' ');
  }
}
