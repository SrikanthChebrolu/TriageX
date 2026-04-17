import 'dotenv/config';
import express        from 'express';
import cors           from 'cors';

import { PORT, NODE_ENV }         from './config.js';
import { requestLogger }          from './middleware/requestLogger.js';
import { errorHandler }           from './middleware/errorHandler.js';
import { initKnowledgeStore }     from './services/rag/knowledgeStore.js';
import { mountSwagger }           from './swagger.js';

import logsRouter      from './routes/logs.js';
import incidentsRouter from './routes/incidents.js';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));   // accept large log batches
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

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initKnowledgeStore();

    const server = app.listen(PORT, () => {
      console.log(`TriageX API running on http://localhost:${PORT}`);
      console.log(`  POST /api/v1/logs/analyze`);
      console.log(`  POST /api/v1/incidents/triage`);
      console.log(`  POST /api/v1/incidents/root-cause`);
      console.log(`  GET  /health`);
      console.log(`  GET  /api-docs        ← Swagger UI`);
      console.log(`  GET  /api-docs.json   ← OpenAPI spec`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    function shutdown(signal) {
      console.log(`\n${signal} received — shutting down gracefully…`);
      server.close(() => {
        console.log('Server closed. Port released.');
        process.exit(0);
      });

      // Force-kill if server hasn't closed within 5 s (e.g. hung keep-alive)
      setTimeout(() => {
        console.error('Forced shutdown after 5 s timeout.');
        process.exit(1);
      }, 5_000).unref();
    }

    process.on('SIGINT',  () => shutdown('SIGINT'));   // Ctrl-C
    process.on('SIGTERM', () => shutdown('SIGTERM'));  // kill / Docker stop

  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();
