import { analyzeAlerts } from '../alertAnalyzer.js';

const makeAlert = (service, severity = 'HIGH', firedAt = '2024-01-15T10:00:05.000Z') => ({
  alertName:   `ALERT_${service.toUpperCase()}`,
  severity,
  service,
  firedAt,
  description: `Alert for ${service}`,
  value:       95,
  threshold:   10,
});

const makeLog = (service, level = 'ERROR', ts = '2024-01-15T10:00:00.000Z') => ({
  service, level, timestamp: ts, message: `${level} in ${service}`,
});

describe('analyzeAlerts', () => {
  test('returns null when alerts array is empty', () => {
    expect(analyzeAlerts([], [], [])).toBeNull();
  });

  test('returns null when alerts is null', () => {
    expect(analyzeAlerts(null, [], [])).toBeNull();
  });

  test('returns an object when alerts are provided', () => {
    const result = analyzeAlerts([makeAlert('svc-a')], [], []);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
  });

  test('alertCount matches the number of alerts', () => {
    const result = analyzeAlerts([makeAlert('svc-a'), makeAlert('svc-b')], [], []);
    expect(result.alertCount).toBe(2);
  });

  test('bySeverity counts alerts by severity level', () => {
    const alerts = [
      makeAlert('svc-a', 'CRITICAL'),
      makeAlert('svc-b', 'HIGH'),
      makeAlert('svc-c', 'HIGH'),
    ];
    const result = analyzeAlerts(alerts, [], []);
    expect(result.bySeverity.CRITICAL).toBe(1);
    expect(result.bySeverity.HIGH).toBe(2);
    expect(result.bySeverity.MEDIUM).toBe(0);
  });

  test('byService counts alerts per service', () => {
    const alerts = [makeAlert('svc-a'), makeAlert('svc-a'), makeAlert('svc-b')];
    const result = analyzeAlerts(alerts, [], []);
    expect(result.byService['svc-a']).toBe(2);
    expect(result.byService['svc-b']).toBe(1);
  });

  test('serviceOverlap lists services with both a fired alert and an ERROR log', () => {
    const alerts = [makeAlert('svc-a'), makeAlert('svc-b')];
    const logs   = [makeLog('svc-a', 'ERROR'), makeLog('svc-c', 'ERROR')];
    const result = analyzeAlerts(alerts, logs, []);
    expect(result.serviceOverlap).toContain('svc-a');
    expect(result.serviceOverlap).not.toContain('svc-b'); // alert but no error log
    expect(result.serviceOverlap).not.toContain('svc-c'); // error log but no alert
  });

  test('serviceOverlap is empty when there is no overlap', () => {
    const alerts = [makeAlert('svc-a')];
    const logs   = [makeLog('svc-b', 'ERROR')];
    const result = analyzeAlerts(alerts, logs, []);
    expect(result.serviceOverlap).toEqual([]);
  });

  test('timeCorrelation entry has strongCorrelation=true when alert fires within 30s of an ERROR', () => {
    const alerts = [{ ...makeAlert('svc-a'), firedAt: '2024-01-15T10:00:05.000Z' }];
    const logs   = [makeLog('svc-a', 'ERROR', '2024-01-15T10:00:10.000Z')]; // 5s apart
    const result = analyzeAlerts(alerts, logs, []);
    expect(result.timeCorrelation[0].strongCorrelation).toBe(true);
  });

  test('timeCorrelation entry has strongCorrelation=false when alert fires >30s from any ERROR', () => {
    const alerts = [{ ...makeAlert('svc-a'), firedAt: '2024-01-15T10:00:00.000Z' }];
    const logs   = [makeLog('svc-a', 'ERROR', '2024-01-15T10:01:00.000Z')]; // 60s apart
    const result = analyzeAlerts(alerts, logs, []);
    expect(result.timeCorrelation[0].strongCorrelation).toBe(false);
  });

  test('timeCorrelation nearestErrorDeltaMs is null when no ERROR logs exist', () => {
    const alerts = [makeAlert('svc-a')];
    const result = analyzeAlerts(alerts, [], []);
    expect(result.timeCorrelation[0].nearestErrorDeltaMs).toBeNull();
  });

  test('dominantAlert is the CRITICAL alert when mixed severities present', () => {
    const alerts = [makeAlert('svc-a', 'HIGH'), makeAlert('svc-b', 'CRITICAL'), makeAlert('svc-c', 'LOW')];
    const result = analyzeAlerts(alerts, [], []);
    expect(result.dominantAlert.severity).toBe('CRITICAL');
  });

  // ── alertScore ────────────────────────────────────────────────────────────

  test('alertScore is capped at 20', () => {
    const alerts = Array.from({ length: 10 }, (_, i) => makeAlert(`svc-${i}`, 'CRITICAL'));
    const logs   = alerts.map(a => makeLog(a.service, 'ERROR', a.firedAt));
    const result = analyzeAlerts(alerts, logs, []);
    expect(result.alertScore).toBeLessThanOrEqual(20);
  });

  test('alertScore is 0 for a single LOW-severity alert with no overlap or correlation', () => {
    const alerts = [makeAlert('svc-a', 'LOW', '2024-01-15T10:00:00.000Z')];
    const logs   = [makeLog('svc-b', 'ERROR', '2024-01-15T12:00:00.000Z')]; // far away, different service
    const result = analyzeAlerts(alerts, logs, []);
    expect(result.alertScore).toBe(0);
  });

  test('CRITICAL alert contributes +5 to alertScore', () => {
    const alerts = [makeAlert('svc-a', 'CRITICAL', '2024-01-15T10:00:00.000Z')];
    const logs   = [makeLog('svc-b', 'ERROR', '2024-01-15T12:00:00.000Z')]; // no overlap, no time corr
    const result = analyzeAlerts(alerts, logs, []);
    expect(result.alertScore).toBeGreaterThanOrEqual(5);
  });

  test('result contains an interpretation string', () => {
    const result = analyzeAlerts([makeAlert('svc-a')], [], []);
    expect(typeof result.interpretation).toBe('string');
    expect(result.interpretation.length).toBeGreaterThan(0);
  });
});
