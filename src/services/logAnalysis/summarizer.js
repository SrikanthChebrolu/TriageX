/**
 * generateSummary — builds a plain-English summary from analysis results.
 * Pure function — no side effects, fully testable.
 * LLM plug-in point: replace with llmProvider.analyze(buildPrompt(analysis), context).
 *
 * @param {{ totalLogs, byService, byTimePeriod, anomalies }} analysis
 * @returns {string}
 */
export function generateSummary({ totalLogs, byService, byTimePeriod, anomalies }) {
  const services      = Object.keys(byService);
  const errorServices = Object.entries(byService)
    .filter(([, s]) => s.errorCount > 0)
    .map(([name, s]) => `${name} (${s.errorCount} errors)`)
    .join(', ');

  const spikeWindows = Object.values(byTimePeriod)
    .filter(w => w.spikeDetected)
    .map(w => `${w.windowStart.slice(11, 19)}–${w.windowEnd.slice(11, 19)} UTC`)
    .join(', ');

  const totalErrors   = Object.values(byService).reduce((s, sv) => s + sv.errorCount, 0);
  const anomalySummary = anomalies.length
    ? `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected (${anomalies.map(a => a.type).join(', ')}).`
    : 'No anomalies detected.';

  return [
    `Analysed ${totalLogs} log entries across ${services.length} service(s): ${services.join(', ')}.`,
    totalErrors > 0 ? `${totalErrors} error(s): ${errorServices}.` : 'No errors found.',
    spikeWindows ? `Error rate spikes in: ${spikeWindows}.` : '',
    anomalySummary,
  ].filter(Boolean).join(' ');
}
