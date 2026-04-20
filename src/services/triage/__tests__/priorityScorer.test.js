import {
  computePriorityScore,
  scoreBySeverity,
  scoreByAffectedServices,
  scoreBySimilarity,
  scoreByTimeOfDay,
  scoreToPriorityBand,
} from '../priorityScorer.js';

describe('scoreBySeverity', () => {
  test('CRITICAL returns 30', () => expect(scoreBySeverity('CRITICAL')).toBe(30));
  test('HIGH returns 22',     () => expect(scoreBySeverity('HIGH')).toBe(22));
  test('MEDIUM returns 12',   () => expect(scoreBySeverity('MEDIUM')).toBe(12));
  test('LOW returns 5',       () => expect(scoreBySeverity('LOW')).toBe(5));
  test('unknown severity returns 0', () => expect(scoreBySeverity('UNKNOWN')).toBe(0));
});

describe('scoreByAffectedServices', () => {
  test('1 service → 7',      () => expect(scoreByAffectedServices(['a'])).toBe(7));
  test('3 services → 21',    () => expect(scoreByAffectedServices(['a', 'b', 'c'])).toBe(21));
  test('4 services → 25 (capped)', () => expect(scoreByAffectedServices(['a', 'b', 'c', 'd'])).toBe(25));
  test('10 services → 25 (cap)', () => expect(scoreByAffectedServices(Array(10).fill('x'))).toBe(25));
  test('empty array → 0',    () => expect(scoreByAffectedServices([])).toBe(0));
});

describe('scoreBySimilarity', () => {
  test('1.0 similarity → 30',  () => expect(scoreBySimilarity(1.0)).toBe(30));
  test('0.5 similarity → 15',  () => expect(scoreBySimilarity(0.5)).toBe(15));
  test('0.0 similarity → 0',   () => expect(scoreBySimilarity(0.0)).toBe(0));
  test('0.33 similarity → 10', () => expect(scoreBySimilarity(0.33)).toBe(10));
  test('rounds to nearest int', () => expect(scoreBySimilarity(0.167)).toBe(5));
});

describe('scoreByTimeOfDay', () => {
  test('returns 15 during market hours (08:00–16:59 UTC)', () => {
    for (const h of [8, 10, 12, 16]) {
      const d = new Date(`2024-01-15T${String(h).padStart(2, '0')}:00:00.000Z`);
      expect(scoreByTimeOfDay(d)).toBe(15);
    }
  });

  test('returns 5 outside market hours', () => {
    for (const h of [0, 6, 7, 17, 20, 23]) {
      const d = new Date(`2024-01-15T${String(h).padStart(2, '0')}:00:00.000Z`);
      expect(scoreByTimeOfDay(d)).toBe(5);
    }
  });
});

describe('scoreToPriorityBand', () => {
  test('≥80 → P1',    () => expect(scoreToPriorityBand(80)).toBe('P1'));
  test('100 → P1',    () => expect(scoreToPriorityBand(100)).toBe('P1'));
  test('79 → P2',     () => expect(scoreToPriorityBand(79)).toBe('P2'));
  test('60 → P2',     () => expect(scoreToPriorityBand(60)).toBe('P2'));
  test('59 → P3',     () => expect(scoreToPriorityBand(59)).toBe('P3'));
  test('40 → P3',     () => expect(scoreToPriorityBand(40)).toBe('P3'));
  test('39 → P4',     () => expect(scoreToPriorityBand(39)).toBe('P4'));
  test('0 → P4',      () => expect(scoreToPriorityBand(0)).toBe('P4'));
});

describe('computePriorityScore', () => {
  const incident = {
    severity:         'CRITICAL',
    affectedServices: ['svc-a', 'svc-b'],
  };

  test('returns all four score components', () => {
    const result = computePriorityScore(incident, 0.8);
    expect(result).toHaveProperty('severityScore');
    expect(result).toHaveProperty('affectedServicesScore');
    expect(result).toHaveProperty('similarityScore');
    expect(result).toHaveProperty('timeOfDayScore');
    expect(result).toHaveProperty('total');
  });

  test('severityScore matches scoreBySeverity for the given severity', () => {
    const result = computePriorityScore(incident, 0.5);
    expect(result.severityScore).toBe(30); // CRITICAL
  });

  test('affectedServicesScore matches scoreByAffectedServices', () => {
    const result = computePriorityScore(incident, 0.5);
    expect(result.affectedServicesScore).toBe(14); // 2 × 7
  });

  test('similarityScore matches scoreBySimilarity', () => {
    const result = computePriorityScore(incident, 0.5);
    expect(result.similarityScore).toBe(15); // round(0.5 × 30)
  });

  test('total is capped at 100', () => {
    // CRITICAL(30) + 4 services(25) + similarity 1.0(30) + timeOfDay(15) = 100
    const bigIncident = { severity: 'CRITICAL', affectedServices: Array(4).fill('svc') };
    const result = computePriorityScore(bigIncident, 1.0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  test('total equals sum of components (up to the cap)', () => {
    const result = computePriorityScore(incident, 0.0);
    const expected = Math.min(
      result.severityScore + result.affectedServicesScore +
      result.similarityScore + result.timeOfDayScore,
      100
    );
    expect(result.total).toBe(expected);
  });
});
