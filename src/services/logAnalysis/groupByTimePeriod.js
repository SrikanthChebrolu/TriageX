import { ERROR_LEVELS, WINDOW_MINUTES, SPIKE_MULTIPLIER } from '../../constants.js';

/**
 * groupByTimePeriod — buckets logs into fixed tumbling windows and flags spikes.
 *
 * A spike is flagged when a window's errorRate > SPIKE_MULTIPLIER × batchErrorRate.
 *
 * @param {Array}  logs           - normalised log entries
 * @param {number} batchErrorRate - batch-level baseline (0–1)
 * @returns {Record<string, { windowStart, windowEnd, logCount, errorCount, errorRate, spikeDetected, services[] }>}
 */
export function groupByTimePeriod(logs, batchErrorRate) {
  const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
  const windowMap = new Map();

  for (const log of logs) {
    const ts          = new Date(log.timestamp).getTime();
    const windowStart = Math.floor(ts / WINDOW_MS) * WINDOW_MS;

    if (!windowMap.has(windowStart)) {
      windowMap.set(windowStart, { logs: [], services: new Set() });
    }
    windowMap.get(windowStart).logs.push(log);
    windowMap.get(windowStart).services.add(log.service);
  }

  const result = {};
  for (const [windowStart, { logs: wLogs, services }] of windowMap) {
    const windowEnd  = new Date(windowStart + WINDOW_MS).toISOString();
    const windowKey  = `${new Date(windowStart).toISOString()}/${windowEnd}`;
    const errorCount = wLogs.filter(l => ERROR_LEVELS.has(l.level)).length;
    const errorRate  = Number((errorCount / wLogs.length).toFixed(2));

    result[windowKey] = {
      windowStart:  new Date(windowStart).toISOString(),
      windowEnd,
      logCount:     wLogs.length,
      errorCount,
      errorRate,
      spikeDetected: errorRate > SPIKE_MULTIPLIER * batchErrorRate,
      services:     [...services],
    };
  }
  return result;
}
