import { groupByTimePeriod } from '../groupByTimePeriod.js';

// All timestamps within the same 1-minute window: 10:00:00 – 10:00:59
const T00 = '2024-01-15T10:00:00.000Z';
const T30 = '2024-01-15T10:00:30.000Z';
const T59 = '2024-01-15T10:00:59.000Z';
// Next window: 10:01:00 – 10:01:59
const T01 = '2024-01-15T10:01:00.000Z';

const makeLog = (timestamp, level, service = 'svc-a') => ({ timestamp, level, service });

describe('groupByTimePeriod', () => {
  test('groups all logs in the same minute into one window', () => {
    const logs = [
      makeLog(T00, 'INFO'),
      makeLog(T30, 'WARN'),
      makeLog(T59, 'ERROR'),
    ];
    const result = groupByTimePeriod(logs, 0);
    expect(Object.keys(result)).toHaveLength(1);
  });

  test('creates separate windows for logs one minute apart', () => {
    const logs = [makeLog(T00, 'INFO'), makeLog(T01, 'INFO')];
    const result = groupByTimePeriod(logs, 0);
    expect(Object.keys(result)).toHaveLength(2);
  });

  test('windowStart and windowEnd are ISO strings exactly one minute apart', () => {
    const logs = [makeLog(T00, 'INFO')];
    const [window] = Object.values(groupByTimePeriod(logs, 0));
    const diff = new Date(window.windowEnd).getTime() - new Date(window.windowStart).getTime();
    expect(diff).toBe(60_000);
  });

  test('logCount matches the number of logs in the window', () => {
    const logs = [makeLog(T00, 'INFO'), makeLog(T30, 'WARN'), makeLog(T59, 'ERROR')];
    const [window] = Object.values(groupByTimePeriod(logs, 0));
    expect(window.logCount).toBe(3);
  });

  test('counts only ERROR and FATAL in errorCount', () => {
    const logs = [
      makeLog(T00, 'DEBUG'),
      makeLog(T00, 'INFO'),
      makeLog(T00, 'WARN'),
      makeLog(T00, 'ERROR'),
      makeLog(T00, 'FATAL'),
    ];
    const [window] = Object.values(groupByTimePeriod(logs, 0));
    expect(window.errorCount).toBe(2);
  });

  test('errorRate is errorCount / logCount rounded to 2 decimal places', () => {
    const logs = [makeLog(T00, 'ERROR'), makeLog(T30, 'INFO'), makeLog(T59, 'INFO')];
    const [window] = Object.values(groupByTimePeriod(logs, 0));
    expect(window.errorRate).toBe(0.33);
  });

  test('spikeDetected is true when errorRate > 2× batchErrorRate', () => {
    // batchErrorRate = 0.1; window errorRate = 1.0 (all errors) → 1.0 > 0.2
    const logs = [makeLog(T00, 'ERROR'), makeLog(T30, 'ERROR')];
    const [window] = Object.values(groupByTimePeriod(logs, 0.1));
    expect(window.spikeDetected).toBe(true);
  });

  test('spikeDetected is false when errorRate ≤ 2× batchErrorRate', () => {
    const logs = [makeLog(T00, 'INFO'), makeLog(T30, 'INFO')];
    const [window] = Object.values(groupByTimePeriod(logs, 0.5));
    expect(window.spikeDetected).toBe(false);
  });

  test('spikeDetected is false when batchErrorRate is 0 and errorRate is also 0', () => {
    const logs = [makeLog(T00, 'INFO')];
    const [window] = Object.values(groupByTimePeriod(logs, 0));
    expect(window.spikeDetected).toBe(false);
  });

  test('services array lists unique services in the window', () => {
    const logs = [
      makeLog(T00, 'INFO', 'svc-a'),
      makeLog(T30, 'INFO', 'svc-b'),
      makeLog(T59, 'INFO', 'svc-a'),
    ];
    const [window] = Object.values(groupByTimePeriod(logs, 0));
    expect(window.services).toHaveLength(2);
    expect(window.services).toEqual(expect.arrayContaining(['svc-a', 'svc-b']));
  });

  test('returns empty object for empty logs array', () => {
    expect(groupByTimePeriod([], 0)).toEqual({});
  });
});
