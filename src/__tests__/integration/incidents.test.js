import request from 'supertest';
import { app }               from '../../app.js';
import { initKnowledgeStore } from '../../services/rag/knowledgeStore.js';

const VALID_INCIDENT = {
  title:            'Order service database connection timeout',
  description:      'Multiple connection timeout errors observed from the order service connecting to the database',
  severity:         'HIGH',
  affectedServices: ['order-service', 'database'],
};

const BASE_LOG = {
  timestamp: '2024-01-15T10:00:00.000Z',
  level:     'ERROR',
  service:   'order-service',
  message:   'Connection timeout to database',
};

const VALID_ROOT_CAUSE = {
  ...VALID_INCIDENT,
  logs: [BASE_LOG],
};

beforeAll(async () => {
  await initKnowledgeStore();
});

// ── POST /api/v1/incidents/triage ─────────────────────────────────────────────

describe('POST /api/v1/incidents/triage', () => {
  test('200 for a valid incident', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send(VALID_INCIDENT)
      .expect(200);

    expect(res.body.error).toBeNull();
    expect(res.body.data).toBeDefined();
    expect(res.body.meta.version).toBe('v1');
  });

  test('response contains all required triage fields', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send(VALID_INCIDENT)
      .expect(200);

    const { data } = res.body;
    expect(data).toHaveProperty('incidentId');
    expect(data).toHaveProperty('receivedAt');
    expect(data).toHaveProperty('priorityScore');
    expect(data).toHaveProperty('priorityBand');
    expect(data).toHaveProperty('scoreBreakdown');
    expect(data).toHaveProperty('investigationSteps');
    expect(data).toHaveProperty('similarIncidents');
    expect(data).toHaveProperty('summary');
  });

  test('priorityBand is one of P1–P4', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send(VALID_INCIDENT)
      .expect(200);

    expect(['P1', 'P2', 'P3', 'P4']).toContain(res.body.data.priorityBand);
  });

  test('priorityScore is between 0 and 100', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send(VALID_INCIDENT)
      .expect(200);

    const score = res.body.data.priorityScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('CRITICAL severity scores higher than LOW for the same incident shape', async () => {
    const [critical, low] = await Promise.all([
      request(app).post('/api/v1/incidents/triage')
        .send({ ...VALID_INCIDENT, severity: 'CRITICAL' }),
      request(app).post('/api/v1/incidents/triage')
        .send({ ...VALID_INCIDENT, severity: 'LOW' }),
    ]);
    expect(critical.body.data.priorityScore).toBeGreaterThan(low.body.data.priorityScore);
  });

  test('investigationSteps is a non-empty array', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send(VALID_INCIDENT)
      .expect(200);

    expect(Array.isArray(res.body.data.investigationSteps)).toBe(true);
    expect(res.body.data.investigationSteps.length).toBeGreaterThan(0);
  });

  test('incidentId has the expected prefix format', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send(VALID_INCIDENT)
      .expect(200);

    expect(res.body.data.incidentId).toMatch(/^triage-/);
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  test('422 when title is missing', async () => {
    const { title, ...noTitle } = VALID_INCIDENT;
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send(noTitle)
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });

  test('422 for an invalid severity', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send({ ...VALID_INCIDENT, severity: 'EXTREME' })
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });

  test('422 when affectedServices is empty', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/triage')
      .send({ ...VALID_INCIDENT, affectedServices: [] })
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });
});

// ── POST /api/v1/incidents/root-cause ─────────────────────────────────────────

describe('POST /api/v1/incidents/root-cause', () => {
  test('200 for a valid request with logs', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(VALID_ROOT_CAUSE)
      .expect(200);

    expect(res.body.error).toBeNull();
    expect(res.body.data).toBeDefined();
  });

  test('response contains all required root-cause fields', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(VALID_ROOT_CAUSE)
      .expect(200);

    const { data } = res.body;
    expect(data).toHaveProperty('analysisId');
    expect(data).toHaveProperty('receivedAt');
    expect(data).toHaveProperty('primaryHypothesis');
    expect(data).toHaveProperty('confidenceScore');
    expect(data).toHaveProperty('evidence');
    expect(data).toHaveProperty('traceAnalysis');
    expect(data).toHaveProperty('similarIncidents');
    expect(data).toHaveProperty('summary');
  });

  test('analysisId has the expected prefix format', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(VALID_ROOT_CAUSE)
      .expect(200);

    expect(res.body.data.analysisId).toMatch(/^rc-/);
  });

  test('confidenceScore.total is between 0 and 100', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(VALID_ROOT_CAUSE)
      .expect(200);

    const total = res.body.data.confidenceScore.total;
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);
  });

  test('confidenceScore.band is one of the four bands', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(VALID_ROOT_CAUSE)
      .expect(200);

    expect(['HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']).toContain(res.body.data.confidenceScore.band);
  });

  test('alertAnalysis is present when alerts are provided', async () => {
    const alert = {
      alertName:   'DB_CONNECTION_HIGH',
      severity:    'CRITICAL',
      service:     'order-service',
      firedAt:     '2024-01-15T10:00:03.000Z',
      description: 'DB connection count critical',
      value:       98,
      threshold:   80,
    };
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send({ ...VALID_ROOT_CAUSE, alerts: [alert] })
      .expect(200);

    expect(res.body.data.alertAnalysis).not.toBeNull();
    expect(res.body.data.confidenceScore.alertsUsed).toBe(true);
  });

  test('alertAnalysis is absent when no alerts provided', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(VALID_ROOT_CAUSE)
      .expect(200);

    expect(res.body.data.confidenceScore.alertsUsed).toBe(false);
  });

  test('traceAnalysis.diagrams is populated when logs contain traceIds spanning multiple services', async () => {
    const logsWithTraces = [
      { ...BASE_LOG, service: 'gateway',       traceId: 'trace-x', timestamp: '2024-01-15T10:00:00.000Z' },
      { ...BASE_LOG, service: 'order-service', traceId: 'trace-x', level: 'ERROR', timestamp: '2024-01-15T10:00:01.000Z' },
    ];
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send({ ...VALID_ROOT_CAUSE, logs: logsWithTraces })
      .expect(200);

    expect(res.body.data.traceAnalysis.tracesFound).toBeGreaterThan(0);
    expect(res.body.data.traceAnalysis.diagrams.length).toBeGreaterThan(0);
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  test('422 when logs are missing', async () => {
    const { logs, ...noLogs } = VALID_ROOT_CAUSE;
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(noLogs)
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });

  test('422 when logs array is empty', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send({ ...VALID_ROOT_CAUSE, logs: [] })
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });

  test('422 when description is missing', async () => {
    const { description, ...noDesc } = VALID_ROOT_CAUSE;
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send(noDesc)
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });

  test('422 for an invalid severity value', async () => {
    const res = await request(app)
      .post('/api/v1/incidents/root-cause')
      .send({ ...VALID_ROOT_CAUSE, severity: 'EXTREME' })
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });
});
