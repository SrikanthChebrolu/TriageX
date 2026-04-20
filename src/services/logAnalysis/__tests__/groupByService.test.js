import { groupByService } from '../groupByService.js';

const makeLog = (service, level, message = 'msg') => ({
  service,
  level,
  message,
  timestamp: '2024-01-15T10:00:00.000Z',
});

const makeCluster = (representativeMessage) => ({
  clusterId: 'c-001',
  representativeMessage,
  memberCount: 1,
});

describe('groupByService', () => {
  test('returns an entry for each unique service', () => {
    const logs = [makeLog('svc-a', 'INFO'), makeLog('svc-b', 'ERROR')];
    const result = groupByService(logs, []);
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['svc-a', 'svc-b']));
  });

  test('counts logCount correctly per service', () => {
    const logs = [
      makeLog('svc-a', 'INFO'),
      makeLog('svc-a', 'ERROR'),
      makeLog('svc-b', 'WARN'),
    ];
    const result = groupByService(logs, []);
    expect(result['svc-a'].logCount).toBe(2);
    expect(result['svc-b'].logCount).toBe(1);
  });

  test('counts only ERROR and FATAL as errors', () => {
    const logs = [
      makeLog('svc-a', 'DEBUG'),
      makeLog('svc-a', 'INFO'),
      makeLog('svc-a', 'WARN'),
      makeLog('svc-a', 'ERROR'),
      makeLog('svc-a', 'FATAL'),
    ];
    const result = groupByService(logs, []);
    expect(result['svc-a'].errorCount).toBe(2);
  });

  test('computes errorRate as errorCount / logCount rounded to 2 decimal places', () => {
    const logs = [makeLog('svc-a', 'ERROR'), makeLog('svc-a', 'INFO'), makeLog('svc-a', 'INFO')];
    const result = groupByService(logs, []);
    expect(result['svc-a'].errorRate).toBe(0.33);
  });

  test('errorRate is 0 when there are no errors', () => {
    const logs = [makeLog('svc-a', 'INFO'), makeLog('svc-a', 'DEBUG')];
    const result = groupByService(logs, []);
    expect(result['svc-a'].errorRate).toBe(0);
  });

  test('errorRate is 1 when all logs are errors', () => {
    const logs = [makeLog('svc-a', 'ERROR'), makeLog('svc-a', 'FATAL')];
    const result = groupByService(logs, []);
    expect(result['svc-a'].errorRate).toBe(1);
  });

  test('associates clusters with the service that produced the representative message', () => {
    const cluster = makeCluster('db timeout');
    const logs = [
      makeLog('svc-a', 'ERROR', 'db timeout'),
      makeLog('svc-b', 'INFO',  'all good'),
    ];
    const result = groupByService(logs, [cluster]);
    expect(result['svc-a'].clusters).toContain(cluster);
    expect(result['svc-b'].clusters).toHaveLength(0);
  });

  test('a cluster is only listed once per service even when multiple logs share the message', () => {
    const cluster = makeCluster('db timeout');
    const logs = [
      makeLog('svc-a', 'ERROR', 'db timeout'),
      makeLog('svc-a', 'ERROR', 'db timeout'),
    ];
    const result = groupByService(logs, [cluster]);
    expect(result['svc-a'].clusters).toHaveLength(1);
  });

  test('handles empty clusters array without throwing', () => {
    const logs = [makeLog('svc-a', 'INFO')];
    expect(() => groupByService(logs, [])).not.toThrow();
  });

  test('returns empty object when logs array is empty', () => {
    expect(groupByService([], [])).toEqual({});
  });
});
