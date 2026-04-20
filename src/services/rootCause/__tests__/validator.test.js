import { validateRootCauseRequest } from '../validator.js';

const BASE_LOG = {
  timestamp: '2024-01-15T10:00:00.000Z',
  level:     'ERROR',
  service:   'order-service',
  message:   'Connection timeout',
};

const VALID = {
  title:            'Order service database timeout',
  description:      'Multiple connection timeout errors',
  severity:         'HIGH',
  affectedServices: ['order-service'],
  logs:             [BASE_LOG],
};

describe('validateRootCauseRequest', () => {
  // ── Type guard ────────────────────────────────────────────────────────────

  test('throws 400 for null body', () => {
    expect(() => validateRootCauseRequest(null)).toThrow(expect.objectContaining({ status: 400 }));
  });

  test('throws 400 for non-object body', () => {
    expect(() => validateRootCauseRequest('string')).toThrow(expect.objectContaining({ status: 400 }));
  });

  // ── Required incident fields ──────────────────────────────────────────────

  test('throws 422 when title is missing', () => {
    expect(() => validateRootCauseRequest({ ...VALID, title: '' })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when description is missing', () => {
    expect(() => validateRootCauseRequest({ ...VALID, description: undefined })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for invalid severity', () => {
    expect(() => validateRootCauseRequest({ ...VALID, severity: 'EXTREME' })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when affectedServices is empty', () => {
    expect(() => validateRootCauseRequest({ ...VALID, affectedServices: [] })).toThrow(expect.objectContaining({ status: 422 }));
  });

  // ── Logs are required ─────────────────────────────────────────────────────

  test('throws 422 when logs are missing', () => {
    const { logs, ...noLogs } = VALID;
    expect(() => validateRootCauseRequest(noLogs)).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when logs array is empty', () => {
    expect(() => validateRootCauseRequest({ ...VALID, logs: [] })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when a log entry is not an object', () => {
    expect(() => validateRootCauseRequest({ ...VALID, logs: ['not an object'] }))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  // ── Alerts are optional ───────────────────────────────────────────────────

  test('accepts a request without alerts', () => {
    const result = validateRootCauseRequest(VALID);
    expect(result.alerts).toBeNull();
  });

  test('accepts a request with an empty alerts array', () => {
    const result = validateRootCauseRequest({ ...VALID, alerts: [] });
    expect(result.alerts).toEqual([]);
  });

  test('throws 422 when an alert entry is not an object', () => {
    expect(() => validateRootCauseRequest({ ...VALID, alerts: ['bad'] }))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  // ── Normalisation ─────────────────────────────────────────────────────────

  test('normalises log.level to uppercase and defaults missing fields', () => {
    const result = validateRootCauseRequest({ ...VALID, logs: [{ level: 'error', service: 'svc' }] });
    expect(result.logs[0].level).toBe('ERROR');
    expect(result.logs[0].traceId).toBeNull();
  });

  test('normalises alert.severity to uppercase', () => {
    const alert = { alertName: 'CPU_HIGH', severity: 'critical', service: 'svc' };
    const result = validateRootCauseRequest({ ...VALID, alerts: [alert] });
    expect(result.alerts[0].severity).toBe('CRITICAL');
  });

  test('trims title and description', () => {
    const result = validateRootCauseRequest({ ...VALID, title: '  t  ', description: '  d  ' });
    expect(result.title).toBe('t');
    expect(result.description).toBe('d');
  });

  test('accepts all four valid severity levels', () => {
    for (const severity of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      expect(() => validateRootCauseRequest({ ...VALID, severity })).not.toThrow();
    }
  });
});
