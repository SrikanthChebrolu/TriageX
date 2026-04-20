import { computeConfidenceScore } from '../confidenceScorer.js';

const makeSignals = (overrides = {}) => ({
  patternMatches: [{ failureDomain: 'database / storage layer', id: 'database_connection_pool' }],
  alertSignal:    { correlation: 0.6, affectedServices: 2 },
  historicalSignal: {
    topMatch:     { similarityScore: 0.8, rootCause: 'database connection pool exhausted' },
    avgSimilarity: 0.5,
  },
  ...overrides,
});

describe('computeConfidenceScore', () => {
  test('returns all expected fields', () => {
    const result = computeConfidenceScore(makeSignals());
    expect(result).toHaveProperty('logCorrelation');
    expect(result).toHaveProperty('serviceCorrelation');
    expect(result).toHaveProperty('historicalSimilarity');
    expect(result).toHaveProperty('convergenceBonus');
    expect(result).toHaveProperty('alertBonus');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('band');
    expect(result).toHaveProperty('alertsUsed');
  });

  test('total is capped at 100 even when signals are maxed', () => {
    const signals = makeSignals({
      alertSignal:     { correlation: 1.0, affectedServices: 10 },
      historicalSignal: { topMatch: { similarityScore: 1.0, rootCause: 'database connection pool' }, avgSimilarity: 1.0 },
    });
    const result = computeConfidenceScore(signals, { alertScore: 20 });
    expect(result.total).toBeLessThanOrEqual(100);
  });

  test('alertsUsed is false when no alertAnalysis provided', () => {
    const result = computeConfidenceScore(makeSignals());
    expect(result.alertsUsed).toBe(false);
  });

  test('alertsUsed is true when alertAnalysis is provided', () => {
    const result = computeConfidenceScore(makeSignals(), { alertScore: 10 });
    expect(result.alertsUsed).toBe(true);
  });

  test('alertBonus is 0 when no alertAnalysis provided', () => {
    const result = computeConfidenceScore(makeSignals());
    expect(result.alertBonus).toBe(0);
  });

  test('alertBonus equals alertAnalysis.alertScore when provided', () => {
    const result = computeConfidenceScore(makeSignals(), { alertScore: 12 });
    expect(result.alertBonus).toBe(12);
  });

  // ── Band thresholds ───────────────────────────────────────────────────────

  test('band is HIGH when total ≥ 75', () => {
    const signals = makeSignals({
      alertSignal:     { correlation: 1.0, affectedServices: 3 },
      historicalSignal: { topMatch: { similarityScore: 1.0, rootCause: 'database connection pool' }, avgSimilarity: 1.0 },
    });
    const result = computeConfidenceScore(signals);
    if (result.total >= 75) expect(result.band).toBe('HIGH');
  });

  test('band is VERY_LOW when total < 25', () => {
    const signals = makeSignals({
      alertSignal:     { correlation: 0.0, affectedServices: 0 },
      historicalSignal: { topMatch: null, avgSimilarity: 0 },
      patternMatches:   [],
    });
    const result = computeConfidenceScore(signals);
    if (result.total < 25) expect(result.band).toBe('VERY_LOW');
  });

  // ── Convergence bonus ─────────────────────────────────────────────────────

  test('grants convergenceBonus when pattern domain keyword appears in historical rootCause', () => {
    const signals = makeSignals({
      patternMatches:   [{ failureDomain: 'database / storage layer' }],
      historicalSignal: { topMatch: { similarityScore: 0.5, rootCause: 'database connection pool saturated' }, avgSimilarity: 0.4 },
    });
    const result = computeConfidenceScore(signals);
    expect(result.convergenceBonus).toBe(15);
  });

  test('convergenceBonus is 0 when pattern domain and historical cause do not match', () => {
    const signals = makeSignals({
      patternMatches:   [{ failureDomain: 'auth-service / identity' }],
      historicalSignal: { topMatch: { similarityScore: 0.5, rootCause: 'database connection pool saturated' }, avgSimilarity: 0.4 },
    });
    const result = computeConfidenceScore(signals);
    expect(result.convergenceBonus).toBe(0);
  });

  test('convergenceBonus is 0 when patternMatches is empty', () => {
    const signals = makeSignals({ patternMatches: [] });
    const result = computeConfidenceScore(signals);
    expect(result.convergenceBonus).toBe(0);
  });

  test('convergenceBonus is 0 when historicalSignal has no topMatch', () => {
    const signals = makeSignals({ historicalSignal: { topMatch: null, avgSimilarity: 0 } });
    const result = computeConfidenceScore(signals);
    expect(result.convergenceBonus).toBe(0);
  });

  // ── logCorrelation caps ───────────────────────────────────────────────────

  test('logCorrelation is 30 when correlation is 1.0', () => {
    const signals = makeSignals({ alertSignal: { correlation: 1.0, affectedServices: 1 } });
    expect(computeConfidenceScore(signals).logCorrelation).toBe(30);
  });

  test('logCorrelation is 0 when correlation is 0', () => {
    const signals = makeSignals({ alertSignal: { correlation: 0, affectedServices: 1 } });
    expect(computeConfidenceScore(signals).logCorrelation).toBe(0);
  });

  // ── serviceCorrelation caps ───────────────────────────────────────────────

  test('serviceCorrelation is capped at 25', () => {
    const signals = makeSignals({ alertSignal: { correlation: 0.5, affectedServices: 100 } });
    expect(computeConfidenceScore(signals).serviceCorrelation).toBeLessThanOrEqual(25);
  });
});
