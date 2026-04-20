import { detectAnomalies } from '../anomalyDetector.js';

const WINDOW_START = '2024-01-15T10:00:00.000Z';
const WINDOW_END   = '2024-01-15T10:01:00.000Z';
const WINDOW_KEY   = `${WINDOW_START}/${WINDOW_END}`;

const makeWindow = (overrides = {}) => ({
  [WINDOW_KEY]: {
    windowStart:   WINDOW_START,
    windowEnd:     WINDOW_END,
    logCount:      5,
    errorCount:    5,
    errorRate:     1.0,
    spikeDetected: false,
    services:      ['svc-a'],
    ...overrides,
  },
});

const makeLog = (level, ts = '2024-01-15T10:00:30.000Z', service = 'svc-a') => ({
  level, service, timestamp: ts,
  message: 'test', traceId: null,
});

describe('detectAnomalies', () => {
  describe('error_spike', () => {
    test('emits error_spike for each window with spikeDetected=true', () => {
      const byTimePeriod = makeWindow({ spikeDetected: true });
      const anomalies = detectAnomalies([], byTimePeriod, {}, 0.1);
      expect(anomalies.filter(a => a.type === 'error_spike')).toHaveLength(1);
    });

    test('includes windowStart and windowEnd on the anomaly', () => {
      const byTimePeriod = makeWindow({ spikeDetected: true });
      const [anomaly] = detectAnomalies([], byTimePeriod, {}, 0.1);
      expect(anomaly.windowStart).toBe(WINDOW_START);
      expect(anomaly.windowEnd).toBe(WINDOW_END);
    });

    test('does not emit error_spike when spikeDetected is false', () => {
      const byTimePeriod = makeWindow({ spikeDetected: false });
      const anomalies = detectAnomalies([], byTimePeriod, {}, 0.5);
      expect(anomalies.filter(a => a.type === 'error_spike')).toHaveLength(0);
    });
  });

  describe('fatal_burst', () => {
    test('emits fatal_burst when ≥3 FATAL logs fall in the window', () => {
      const byTimePeriod = makeWindow();
      const logs = [
        makeLog('FATAL', '2024-01-15T10:00:10.000Z'),
        makeLog('FATAL', '2024-01-15T10:00:20.000Z'),
        makeLog('FATAL', '2024-01-15T10:00:30.000Z'),
      ];
      const anomalies = detectAnomalies(logs, byTimePeriod, {}, 0);
      expect(anomalies.filter(a => a.type === 'fatal_burst')).toHaveLength(1);
    });

    test('does not emit fatal_burst when fewer than 3 FATAL logs in the window', () => {
      const byTimePeriod = makeWindow();
      const logs = [
        makeLog('FATAL', '2024-01-15T10:00:10.000Z'),
        makeLog('FATAL', '2024-01-15T10:00:20.000Z'),
      ];
      const anomalies = detectAnomalies(logs, byTimePeriod, {}, 0);
      expect(anomalies.filter(a => a.type === 'fatal_burst')).toHaveLength(0);
    });

    test('does not count FATAL logs outside the window boundary', () => {
      const byTimePeriod = makeWindow();
      const logs = [
        makeLog('FATAL', '2024-01-15T10:00:10.000Z'),
        makeLog('FATAL', '2024-01-15T10:00:20.000Z'),
        makeLog('FATAL', '2024-01-15T10:01:00.000Z'), // exactly at windowEnd — excluded (<)
      ];
      const anomalies = detectAnomalies(logs, byTimePeriod, {}, 0);
      expect(anomalies.filter(a => a.type === 'fatal_burst')).toHaveLength(0);
    });
  });

  describe('single_service_dominance', () => {
    test('emits single_service_dominance when one service has >80% of all errors', () => {
      const logs = [
        makeLog('ERROR'), makeLog('ERROR'), makeLog('ERROR'), makeLog('ERROR'), makeLog('ERROR'),
        makeLog('ERROR', '2024-01-15T10:00:30.000Z', 'svc-b'),
      ];
      const byService = {
        'svc-a': { errorCount: 5 },
        'svc-b': { errorCount: 1 },
      };
      const anomalies = detectAnomalies(logs, {}, byService, 0);
      expect(anomalies.filter(a => a.type === 'single_service_dominance')).toHaveLength(1);
      expect(anomalies.find(a => a.type === 'single_service_dominance').service).toBe('svc-a');
    });

    test('does not emit dominance when no service exceeds 80%', () => {
      const logs = [makeLog('ERROR'), makeLog('ERROR', '2024-01-15T10:00:00.000Z', 'svc-b')];
      const byService = { 'svc-a': { errorCount: 1 }, 'svc-b': { errorCount: 1 } };
      const anomalies = detectAnomalies(logs, {}, byService, 0);
      expect(anomalies.filter(a => a.type === 'single_service_dominance')).toHaveLength(0);
    });

    test('does not emit dominance when there are no errors at all', () => {
      const logs = [makeLog('INFO'), makeLog('WARN')];
      const byService = { 'svc-a': { errorCount: 0 } };
      const anomalies = detectAnomalies(logs, {}, byService, 0);
      expect(anomalies.filter(a => a.type === 'single_service_dominance')).toHaveLength(0);
    });
  });

  test('returns empty array when no anomalies are detected', () => {
    const logs = [makeLog('INFO')];
    const byTimePeriod = makeWindow({ spikeDetected: false });
    const byService = { 'svc-a': { errorCount: 0 } };
    const anomalies = detectAnomalies(logs, byTimePeriod, byService, 0.1);
    expect(anomalies).toHaveLength(0);
  });

  test('can detect multiple anomaly types in a single call', () => {
    // 5 ERRORs + 3 FATALs = 8 total errors, all from svc-a → dominance (8/8 = 100%)
    const logs = [
      makeLog('ERROR'), makeLog('ERROR'), makeLog('ERROR'), makeLog('ERROR'), makeLog('ERROR'),
      makeLog('FATAL', '2024-01-15T10:00:05.000Z'),
      makeLog('FATAL', '2024-01-15T10:00:10.000Z'),
      makeLog('FATAL', '2024-01-15T10:00:15.000Z'),
    ];
    const byTimePeriod = makeWindow({ spikeDetected: true, errorRate: 1.0 });
    const byService = { 'svc-a': { errorCount: 8 } }; // all 8 errors belong to svc-a
    const anomalies = detectAnomalies(logs, byTimePeriod, byService, 0.1);
    const types = anomalies.map(a => a.type);
    expect(types).toContain('error_spike');
    expect(types).toContain('fatal_burst');
    expect(types).toContain('single_service_dominance');
  });
});
