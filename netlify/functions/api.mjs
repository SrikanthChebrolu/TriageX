import serverless            from 'serverless-http';
import { app }               from '../../src/app.js';
import { initKnowledgeStore } from '../../src/services/rag/knowledgeStore.js';

// Lazy-init: runs once on cold start, skipped on warm invocations
let ready = false;
async function ensureInit() {
  if (!ready) {
    await initKnowledgeStore();
    ready = true;
  }
}

const serverlessHandler = serverless(app);

export const handler = async (event, context) => {
  await ensureInit();
  return serverlessHandler(event, context);
};
