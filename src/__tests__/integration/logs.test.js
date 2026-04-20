import request from 'supertest';
import { app }               from '../../app.js';
import { initKnowledgeStore } from '../../services/rag/knowledgeStore.js';

const BASE_LOG = {
  timestamp: '2024-01-15T10:00:00.000Z',
  level:     'ERROR',
  service:   'order-service',
  message:   'Connection timeout to database',
};

beforeAll(async () => {
  await initKnowledgeStore();
});

describe('POST /api/v1/logs/analyze', () => {
  // ── Happy path ────────────────────────────────────────────────────────────

  test('200 with { logs: [...] } body shape', async () => {
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs: [BASE_LOG] })
      .expect(200);

    expect(res.body.error).toBeNull();
    expect(res.body.data).toBeDefined();
    expect(res.body.meta.version).toBe('v1');
  });

  test('200 with raw array body shape', async () => {
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send([BASE_LOG])
      .expect(200);

    expect(res.body.data).toBeDefined();
  });

  test('response contains all expected top-level fields', async () => {
    const logs = [
      { ...BASE_LOG, level: 'ERROR', service: 'svc-a', message: 'timeout' },
      { ...BASE_LOG, level: 'INFO',  service: 'svc-a', message: 'retry' },
      { ...BASE_LOG, level: 'ERROR', service: 'svc-b', message: 'timeout' },
    ];
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs })
      .expect(200);

    const { data } = res.body;
    expect(data).toHaveProperty('totalLogs');
    expect(data).toHaveProperty('analyzedAt');
    expect(data).toHaveProperty('byService');
    expect(data).toHaveProperty('byTimePeriod');
    expect(data).toHaveProperty('anomalies');
    expect(data).toHaveProperty('retrievedContext');
    expect(data).toHaveProperty('summary');
  });

  test('totalLogs matches the number of submitted logs', async () => {
    const logs = [BASE_LOG, { ...BASE_LOG, message: 'second log' }];
    const res  = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs })
      .expect(200);

    expect(res.body.data.totalLogs).toBe(2);
  });

  test('byService groups logs by service name', async () => {
    const logs = [
      { ...BASE_LOG, service: 'alpha', message: 'err' },
      { ...BASE_LOG, service: 'beta',  message: 'err' },
    ];
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs })
      .expect(200);

    expect(res.body.data.byService).toHaveProperty('alpha');
    expect(res.body.data.byService).toHaveProperty('beta');
  });

  test('detects single_service_dominance anomaly when one service owns all errors', async () => {
    const logs = Array.from({ length: 10 }, () => ({
      ...BASE_LOG,
      level:   'ERROR',
      service: 'failing-svc',
      message: `Error ${Math.random()}`,
    }));
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs })
      .expect(200);

    const types = res.body.data.anomalies.map(a => a.type);
    expect(types).toContain('single_service_dominance');
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  test('422 when logs array is empty', async () => {
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs: [] })
      .expect(422);

    expect(res.body.error).toBeTruthy();
    expect(res.body.data).toBeNull();
  });

  test('422 when logs array exceeds 500 entries', async () => {
    const oversized = Array.from({ length: 501 }, () => ({ ...BASE_LOG }));
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs: oversized })
      .expect(422);

    expect(res.body.error).toMatch(/500/);
  });

  test('422 for a log entry with an invalid level', async () => {
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs: [{ ...BASE_LOG, level: 'TRACE' }] })
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });

  test('422 for a log entry with a missing service field', async () => {
    const { service, ...noService } = BASE_LOG;
    const res = await request(app)
      .post('/api/v1/logs/analyze')
      .send({ logs: [noService] })
      .expect(422);

    expect(res.body.error).toBeTruthy();
  });

  test('422 when body is completely empty', async () => {
    await request(app)
      .post('/api/v1/logs/analyze')
      .send({})
      .expect(422);
  });
});
