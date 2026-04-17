import { ERROR_LEVELS } from '../../constants.js';

/**
 * detectAnomalies — checks for three anomaly types across the log batch.
 *
 * Types:
 *  - error_spike              — window errorRate > 2× batch average
 *  - fatal_burst              — ≥3 FATAL logs in any 1-minute window
 *  - single_service_dominance — one service accounts for >80% of all errors
 *
 * @returns {Array<{ type, detail, ... }>}
 */
export function detectAnomalies(logs, byTimePeriod, byService, batchErrorRate) {
  const anomalies = [];

  // 1. Error spikes per time window
  for (const window of Object.values(byTimePeriod)) {
    if (window.spikeDetected) {
      anomalies.push({
        type:        'error_spike',
        services:    window.services,
        windowStart: window.windowStart,
        windowEnd:   window.windowEnd,
        detail:      `Error rate ${(window.errorRate * 100).toFixed(0)}% vs batch average ${(batchErrorRate * 100).toFixed(0)}% in window ${window.windowStart.slice(11, 19)}–${window.windowEnd.slice(11, 19)} UTC`,
      });
    }
  }

  // 2. Fatal bursts per time window
  const WINDOW_MS = 60_000;
  for (const window of Object.values(byTimePeriod)) {
    const fatals = logs.filter(l =>
      l.level === 'FATAL' &&
      new Date(l.timestamp) >= new Date(window.windowStart) &&
      new Date(l.timestamp) <  new Date(window.windowEnd)
    ).length;
    if (fatals >= 3) {
      anomalies.push({
        type:        'fatal_burst',
        services:    window.services,
        windowStart: window.windowStart,
        windowEnd:   window.windowEnd,
        detail:      `${fatals} FATAL logs within the 1-minute window starting ${window.windowStart.slice(11, 19)} UTC`,
      });
    }
  }

  // 3. Single-service error dominance
  const totalErrors = logs.filter(l => ERROR_LEVELS.has(l.level)).length;
  for (const [service, stats] of Object.entries(byService)) {
    if (totalErrors > 0 && stats.errorCount / totalErrors > 0.8) {
      anomalies.push({
        type:    'single_service_dominance',
        service,
        detail:  `${service} accounts for ${((stats.errorCount / totalErrors) * 100).toFixed(0)}% of all errors in this batch`,
      });
    }
  }

  return anomalies;
}
