import { LLMProvider } from './interface.js';

/**
 * MockLLMProvider — deterministic log-analysis summary.
 * No API calls. Pattern-matches analysis output into a readable string.
 * Real provider: swap this class via LLM_PROVIDER env var.
 */
export class MockLLMProvider extends LLMProvider {
  async analyze(analysis, context = []) {
    const { byService, byTimePeriod, anomalies, totalLogs } = analysis;

    const services      = Object.keys(byService);
    const worstService  = this._worstService(byService);
    const spikeWindows  = Object.values(byTimePeriod).filter(w => w.spikeDetected).map(w => w.windowStart.slice(11, 19));
    const anomalyText   = anomalies.length
      ? `Anomalies detected: ${anomalies.map(a => a.detail).join('; ')}.`
      : 'No anomalies flagged.';

    const contextText = context.length
      ? `Similar historical incident: "${context[0].incident.title}" — ${context[0].incident.resolution} (resolved in ${context[0].incident.resolvedInMin} min).`
      : 'No similar historical incidents found.';

    const totalErrors = Object.values(byService).reduce((s, sv) => s + sv.errorCount, 0);

    return [
      `Analysed ${totalLogs} log entries across ${services.length} service(s): ${services.join(', ')}.`,
      totalErrors > 0 ? `${totalErrors} error(s) found. ${worstService ? `Highest error rate: ${worstService.name} (${(worstService.errorRate * 100).toFixed(0)}%).` : ''}` : 'No errors found.',
      spikeWindows.length ? `Error rate spike(s) at: ${spikeWindows.join(', ')} UTC.` : '',
      anomalyText,
      contextText,
    ].filter(Boolean).join(' ');
  }

  _worstService(byService) {
    const entries = Object.entries(byService).filter(([, s]) => s.errorCount > 0);
    if (!entries.length) return null;
    const [name, stats] = entries.sort(([, a], [, b]) => b.errorRate - a.errorRate)[0];
    return { name, ...stats };
  }
}
