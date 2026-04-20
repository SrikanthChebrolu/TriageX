import { validateAndNormalize } from '../validator.js';

const BASE_LOG = {
  timestamp: '2024-01-15T10:00:00.000Z',
  level:     'ERROR',
  service:   'order-service',
  message:   'Connection timeout to database',
};

describe('validateAndNormalize', () => {
  // ── Array-level guards ────────────────────────────────────────────────────

  test('throws 422 when input is null', () => {
    expect(() => validateAndNormalize(null)).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when input is not an array', () => {
    expect(() => validateAndNormalize({ logs: [] })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when array is empty', () => {
    expect(() => validateAndNormalize([])).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when array exceeds 500 entries', () => {
    const oversized = Array.from({ length: 501 }, () => ({ ...BASE_LOG }));
    expect(() => validateAndNormalize(oversized)).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('accepts exactly 500 entries without throwing', () => {
    const maxBatch = Array.from({ length: 500 }, () => ({ ...BASE_LOG }));
    expect(() => validateAndNormalize(maxBatch)).not.toThrow();
  });

  // ── Field-level validation ────────────────────────────────────────────────

  test('throws 422 for invalid (non-ISO) timestamp', () => {
    expect(() => validateAndNormalize([{ ...BASE_LOG, timestamp: 'not-a-date' }]))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for missing timestamp', () => {
    const { timestamp, ...noTs } = BASE_LOG;
    expect(() => validateAndNormalize([noTs])).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for an unrecognised log level', () => {
    expect(() => validateAndNormalize([{ ...BASE_LOG, level: 'VERBOSE' }]))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for missing service', () => {
    expect(() => validateAndNormalize([{ ...BASE_LOG, service: '' }]))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for whitespace-only service', () => {
    expect(() => validateAndNormalize([{ ...BASE_LOG, service: '   ' }]))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for missing message', () => {
    expect(() => validateAndNormalize([{ ...BASE_LOG, message: '' }]))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for whitespace-only message', () => {
    expect(() => validateAndNormalize([{ ...BASE_LOG, message: '   ' }]))
      .toThrow(expect.objectContaining({ status: 422 }));
  });

  // ── Valid input — normalisation ───────────────────────────────────────────

  test('returns a normalised log entry for a minimal valid input', () => {
    const [result] = validateAndNormalize([BASE_LOG]);
    expect(result).toEqual({
      timestamp: BASE_LOG.timestamp,
      level:     'ERROR',
      service:   'order-service',
      message:   'Connection timeout to database',
      traceId:   null,
      instance:  'order-service',
    });
  });

  test('trims leading/trailing whitespace from service and message', () => {
    const [result] = validateAndNormalize([{ ...BASE_LOG, service: '  svc  ', message: '  msg  ' }]);
    expect(result.service).toBe('svc');
    expect(result.message).toBe('msg');
  });

  test('defaults traceId to null when not provided', () => {
    const [result] = validateAndNormalize([BASE_LOG]);
    expect(result.traceId).toBeNull();
  });

  test('preserves a provided traceId', () => {
    const [result] = validateAndNormalize([{ ...BASE_LOG, traceId: 'trace-abc-123' }]);
    expect(result.traceId).toBe('trace-abc-123');
  });

  test('defaults instance to service when not provided', () => {
    const [result] = validateAndNormalize([BASE_LOG]);
    expect(result.instance).toBe('order-service');
  });

  test('preserves a custom instance value', () => {
    const [result] = validateAndNormalize([{ ...BASE_LOG, instance: 'order-service-pod-2' }]);
    expect(result.instance).toBe('order-service-pod-2');
  });

  test('accepts all five valid log levels', () => {
    for (const level of ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']) {
      expect(() => validateAndNormalize([{ ...BASE_LOG, level }])).not.toThrow();
    }
  });

  test('returns one entry per input log', () => {
    const input = [BASE_LOG, { ...BASE_LOG, message: 'Second log' }];
    expect(validateAndNormalize(input)).toHaveLength(2);
  });

  test('reports the correct index in the error message for an invalid entry', () => {
    const input = [BASE_LOG, { ...BASE_LOG, level: 'BAD' }];
    expect(() => validateAndNormalize(input)).toThrow(/logs\[1\]/);
  });
});
