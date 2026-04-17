import express        from 'express';
import cors           from 'cors';

import { requestLogger }  from './middleware/requestLogger.js';
import { errorHandler }   from './middleware/errorHandler.js';
import { mountSwagger }   from './swagger.js';
import { NODE_ENV }       from './config.js';

import logsRouter      from './routes/logs.js';
import incidentsRouter from './routes/incidents.js';

export const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/logs',      logsRouter);
app.use('/api/v1/incidents', incidentsRouter);

// ── Swagger UI ────────────────────────────────────────────────────────────────
mountSwagger(app);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: NODE_ENV, timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ data: null, error: 'Route not found', meta: {} });
});

// ── Centralised error handler (must be last) ──────────────────────────────────
app.use(errorHandler);
