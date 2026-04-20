import { validateIncident } from '../validator.js';

const VALID = {
  title:            'Order service database timeout',
  description:      'Multiple connection timeout errors from the order service',
  severity:         'HIGH',
  affectedServices: ['order-service', 'database'],
};

describe('validateIncident', () => {
  // ── Type guard ────────────────────────────────────────────────────────────

  test('throws 422 for null body', () => {
    expect(() => validateIncident(null)).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for non-object body', () => {
    expect(() => validateIncident('string')).toThrow(expect.objectContaining({ status: 422 }));
  });

  // ── Required fields ───────────────────────────────────────────────────────

  test('throws 422 when title is missing', () => {
    expect(() => validateIncident({ ...VALID, title: undefined })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when title is whitespace-only', () => {
    expect(() => validateIncident({ ...VALID, title: '   ' })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when description is missing', () => {
    expect(() => validateIncident({ ...VALID, description: undefined })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when description is empty string', () => {
    expect(() => validateIncident({ ...VALID, description: '' })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 for invalid severity value', () => {
    expect(() => validateIncident({ ...VALID, severity: 'SEVERE' })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when affectedServices is not an array', () => {
    expect(() => validateIncident({ ...VALID, affectedServices: 'svc' })).toThrow(expect.objectContaining({ status: 422 }));
  });

  test('throws 422 when affectedServices is empty', () => {
    expect(() => validateIncident({ ...VALID, affectedServices: [] })).toThrow(expect.objectContaining({ status: 422 }));
  });

  // ── Valid input — normalisation ───────────────────────────────────────────

  test('returns a normalised incident for valid input', () => {
    const result = validateIncident(VALID);
    expect(result).toEqual({
      title:            'Order service database timeout',
      description:      'Multiple connection timeout errors from the order service',
      severity:         'HIGH',
      affectedServices: ['order-service', 'database'],
    });
  });

  test('trims whitespace from title and description', () => {
    const result = validateIncident({ ...VALID, title: '  Title  ', description: '  Desc  ' });
    expect(result.title).toBe('Title');
    expect(result.description).toBe('Desc');
  });

  test('trims and stringifies each affected service entry', () => {
    const result = validateIncident({ ...VALID, affectedServices: ['  svc-a  ', 42] });
    expect(result.affectedServices).toEqual(['svc-a', '42']);
  });

  test('accepts all four valid severity levels', () => {
    for (const severity of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      expect(() => validateIncident({ ...VALID, severity })).not.toThrow();
    }
  });
});
