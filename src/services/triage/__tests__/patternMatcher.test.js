import { matchErrorPatterns } from '../patternMatcher.js';

describe('matchErrorPatterns', () => {
  test('matches connection_timeout pattern from title keywords', () => {
    const incident = { title: 'Service connection timeout', description: 'socket error' };
    const patterns = matchErrorPatterns(incident);
    expect(patterns[0].id).toBe('connection_timeout');
  });

  test('matches database_error pattern from description keywords', () => {
    const incident = { title: 'High latency', description: 'connection pool exhausted database deadlock' };
    const patterns = matchErrorPatterns(incident);
    expect(patterns.map(p => p.id)).toContain('database_error');
  });

  test('matches auth_failure pattern on 401 / token keywords', () => {
    const incident = { title: '401 unauthorized error', description: 'invalid token jwt' };
    const patterns = matchErrorPatterns(incident);
    expect(patterns.map(p => p.id)).toContain('auth_failure');
  });

  test('matches rate_limit pattern on 429 / throttle keywords', () => {
    const incident = { title: '429 too many requests', description: 'throttle quota exceeded' };
    const patterns = matchErrorPatterns(incident);
    expect(patterns.map(p => p.id)).toContain('rate_limit');
  });

  test('returns the unknown pattern when no keywords match', () => {
    const incident = { title: 'Completely unrelated issue', description: 'no recognisable patterns here' };
    const patterns = matchErrorPatterns(incident);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].id).toBe('unknown');
  });

  test('returns at most 3 patterns', () => {
    // Use keywords that span multiple patterns
    const incident = {
      title:       'timeout connection pool deadlock 401 token cascade throttle 429',
      description: 'timeout connection pool deadlock 401 token cascade throttle 429',
    };
    const patterns = matchErrorPatterns(incident);
    expect(patterns.length).toBeLessThanOrEqual(3);
  });

  test('returns patterns sorted by keyword match count (highest first)', () => {
    // connection_timeout keywords appear more in this text
    const incident = {
      title:       'timeout timeout connection refused socket unreachable timed out',
      description: 'socket timed out',
    };
    const patterns = matchErrorPatterns(incident);
    const counts = patterns.map(p =>
      p.keywords.filter(kw => `${incident.title} ${incident.description}`.toLowerCase().includes(kw)).length
    );
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]);
    }
  });

  test('matching is case-insensitive', () => {
    const incident = { title: 'DATABASE DEADLOCK', description: 'CONNECTION POOL EXHAUSTED' };
    const patterns = matchErrorPatterns(incident);
    expect(patterns.map(p => p.id)).toContain('database_error');
  });

  test('never includes the unknown pattern alongside real matches', () => {
    const incident = { title: 'timeout error', description: 'connection refused' };
    const patterns = matchErrorPatterns(incident);
    expect(patterns.map(p => p.id)).not.toContain('unknown');
  });

  test('each returned pattern has required fields', () => {
    const incident = { title: 'database deadlock', description: 'connection pool' };
    const patterns = matchErrorPatterns(incident);
    for (const p of patterns) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('failureDomain');
      expect(p).toHaveProperty('steps');
    }
  });
});
