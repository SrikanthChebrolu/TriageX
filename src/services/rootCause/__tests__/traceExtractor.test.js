import { extractTraceFlows } from '../traceExtractor.js';

const makeLog = (service, level, traceId, ts = '2024-01-15T10:00:00.000Z') => ({
  service, level, traceId, timestamp: ts,
  message: `${level} log from ${service}`,
});

describe('extractTraceFlows', () => {
  test('returns empty array for empty logs', () => {
    expect(extractTraceFlows([])).toEqual([]);
  });

  test('returns empty array when logs is null', () => {
    expect(extractTraceFlows(null)).toEqual([]);
  });

  test('excludes logs without a traceId', () => {
    const logs = [
      makeLog('svc-a', 'INFO', null),
      makeLog('svc-b', 'ERROR', null),
    ];
    expect(extractTraceFlows(logs)).toEqual([]);
  });

  test('excludes single-service traces (must span ≥2 services)', () => {
    const logs = [
      makeLog('svc-a', 'ERROR', 'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-a', 'FATAL', 'trace-1', '2024-01-15T10:00:01.000Z'),
    ];
    expect(extractTraceFlows(logs)).toEqual([]);
  });

  test('includes cross-service traces', () => {
    const logs = [
      makeLog('svc-a', 'INFO',  'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'ERROR', 'trace-1', '2024-01-15T10:00:01.000Z'),
    ];
    const flows = extractTraceFlows(logs);
    expect(flows).toHaveLength(1);
    expect(flows[0].traceId).toBe('trace-1');
  });

  test('events are sorted by timestamp ascending', () => {
    const logs = [
      makeLog('svc-b', 'ERROR', 'trace-1', '2024-01-15T10:00:02.000Z'),
      makeLog('svc-a', 'INFO',  'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-c', 'WARN',  'trace-1', '2024-01-15T10:00:01.000Z'),
    ];
    const [flow] = extractTraceFlows(logs);
    expect(flow.events[0].service).toBe('svc-a');
    expect(flow.events[1].service).toBe('svc-c');
    expect(flow.events[2].service).toBe('svc-b');
  });

  test('services list reflects order of first appearance', () => {
    const logs = [
      makeLog('svc-a', 'INFO',  'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'INFO',  'trace-1', '2024-01-15T10:00:01.000Z'),
      makeLog('svc-a', 'ERROR', 'trace-1', '2024-01-15T10:00:02.000Z'),
    ];
    const [flow] = extractTraceFlows(logs);
    expect(flow.services).toEqual(['svc-a', 'svc-b']);
  });

  test('hasFailure is true when the trace contains an ERROR log', () => {
    const logs = [
      makeLog('svc-a', 'INFO',  'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'ERROR', 'trace-1', '2024-01-15T10:00:01.000Z'),
    ];
    const [flow] = extractTraceFlows(logs);
    expect(flow.hasFailure).toBe(true);
  });

  test('hasFailure is false when the trace has no ERROR logs', () => {
    const logs = [
      makeLog('svc-a', 'INFO', 'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'WARN', 'trace-1', '2024-01-15T10:00:01.000Z'),
    ];
    const [flow] = extractTraceFlows(logs);
    expect(flow.hasFailure).toBe(false);
  });

  test('failureOrigin is the service of the first ERROR in the trace', () => {
    const logs = [
      makeLog('svc-a', 'INFO',  'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'ERROR', 'trace-1', '2024-01-15T10:00:01.000Z'),
      makeLog('svc-c', 'ERROR', 'trace-1', '2024-01-15T10:00:02.000Z'),
    ];
    const [flow] = extractTraceFlows(logs);
    expect(flow.failureOrigin).toBe('svc-b');
  });

  test('failureOrigin is null when no ERROR logs exist', () => {
    const logs = [
      makeLog('svc-a', 'INFO', 'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'WARN', 'trace-1', '2024-01-15T10:00:01.000Z'),
    ];
    const [flow] = extractTraceFlows(logs);
    expect(flow.failureOrigin).toBeNull();
  });

  test('traces with failures are sorted before those without', () => {
    const logsFailure = [
      makeLog('svc-a', 'INFO',  'trace-fail', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'ERROR', 'trace-fail', '2024-01-15T10:00:01.000Z'),
    ];
    const logsOk = [
      makeLog('svc-c', 'INFO', 'trace-ok', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-d', 'WARN', 'trace-ok', '2024-01-15T10:00:01.000Z'),
    ];
    const flows = extractTraceFlows([...logsOk, ...logsFailure]);
    expect(flows[0].hasFailure).toBe(true);
    expect(flows[1].hasFailure).toBe(false);
  });

  test('handles multiple distinct traces correctly', () => {
    const logs = [
      makeLog('svc-a', 'ERROR', 'trace-1', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-b', 'INFO',  'trace-1', '2024-01-15T10:00:01.000Z'),
      makeLog('svc-c', 'WARN',  'trace-2', '2024-01-15T10:00:00.000Z'),
      makeLog('svc-d', 'INFO',  'trace-2', '2024-01-15T10:00:01.000Z'),
    ];
    const flows = extractTraceFlows(logs);
    expect(flows).toHaveLength(2);
    const ids = flows.map(f => f.traceId);
    expect(ids).toContain('trace-1');
    expect(ids).toContain('trace-2');
  });
});
