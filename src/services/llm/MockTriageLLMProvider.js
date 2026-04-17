import { LLMProvider } from './interface.js';

/**
 * MockTriageLLMProvider — deterministic triage summary.
 * Extracts key signals from analysis + RAG context, assembles a structured string.
 */
export class MockTriageLLMProvider extends LLMProvider {
  async analyze(triageData, context = []) {
    const { scoreBreakdown, priorityBand, investigationSteps, incident } = triageData;

    const topIncident    = context[0] ?? null;
    const failureDomains = [...new Set(investigationSteps.map(s => s.failureDomain))];
    const startService   = this._identifyStartService(incident, investigationSteps);

    const historicalLine = topIncident
      ? `High similarity to "${topIncident.incident.title}" (${(topIncident.similarityScore * 100).toFixed(0)}% match). Past resolution: ${topIncident.incident.resolution} (${topIncident.incident.resolvedInMin} min).`
      : 'No closely matching historical incidents found.';

    return [
      `${priorityBand} — priority score ${scoreBreakdown.total}/100.`,
      historicalLine,
      `Start investigation at: ${startService}.`,
      `Likely failure domain(s): ${failureDomains.join(' → ')}.`,
      `${investigationSteps.length} investigation step(s) generated.`,
    ].join(' ');
  }

  _identifyStartService(incident, steps) {
    if (!steps.length) return incident.affectedServices[0] ?? 'unknown';
    const topStepLogs = steps[0].logsToCheck.join(' ').toLowerCase();
    return incident.affectedServices.find(s => topStepLogs.includes(s.toLowerCase()))
      ?? incident.affectedServices[0];
  }
}
