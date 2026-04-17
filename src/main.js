import 'dotenv/config';
import { PORT }                   from './config.js';
import { initKnowledgeStore }     from './services/rag/knowledgeStore.js';
import { app }                    from './app.js';

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
