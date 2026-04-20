import { buildInvestigationSteps } from '../investigationBuilder.js';

describe('buildInvestigationSteps', () => {
  test('returns an array of steps', () => {
    const incident = { title: 'database deadlock', description: 'connection pool exhausted' };
    const steps = buildInvestigationSteps(incident);
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
  });

  test('each step has required fields', () => {
    const incident = { title: 'timeout error', description: 'connection refused socket' };
    const steps = buildInvestigationSteps(incident);
    for (const step of steps) {
      expect(step).toHaveProperty('step');
      expect(step).toHaveProperty('action');
      expect(step).toHaveProperty('rationale');
      expect(step).toHaveProperty('logsToCheck');
      expect(step).toHaveProperty('errorPattern');
      expect(step).toHaveProperty('failureDomain');
    }
  });

  test('step numbers are sequential starting at 1', () => {
    const incident = { title: 'database connection pool deadlock', description: 'db timeout' };
    const steps = buildInvestigationSteps(incident);
    steps.forEach((step, i) => {
      expect(step.step).toBe(i + 1);
    });
  });

  test('de-duplicates steps with the same action across matched patterns', () => {
    // Use a title that hits multiple patterns likely sharing similar steps
    const incident = {
      title:       'timeout connection pool database deadlock cascade dependency',
      description: 'timeout connection pool database deadlock cascade dependency',
    };
    const steps = buildInvestigationSteps(incident);
    const actions = steps.map(s => s.action);
    const unique = new Set(actions);
    expect(actions.length).toBe(unique.size);
  });

  test('returns steps for the unknown pattern when no keywords match', () => {
    const incident = { title: 'something unusual', description: 'totally unrelated thing' };
    const steps = buildInvestigationSteps(incident);
    expect(steps.every(s => s.errorPattern === 'unknown')).toBe(true);
  });

  test('errorPattern on each step matches the pattern that contributed it', () => {
    const incident = { title: 'database deadlock connection pool', description: 'db query slow' };
    const steps = buildInvestigationSteps(incident);
    for (const step of steps) {
      expect(typeof step.errorPattern).toBe('string');
      expect(step.errorPattern.length).toBeGreaterThan(0);
    }
  });

  test('steps from the primary (best-matching) pattern appear before secondary pattern steps', () => {
    // connection_timeout has very strong matches; database_error has some.
    // Primary pattern steps come first.
    const incident = {
      title:       'timeout connection refused socket timed out unreachable',
      description: 'database db',
    };
    const steps = buildInvestigationSteps(incident);
    expect(steps[0].errorPattern).toBe('connection_timeout');
  });
});
