import serverless            from 'serverless-http';
import { app }               from '../../src/app.js';
import { initKnowledgeStore } from '../../src/services/rag/knowledgeStore.js';

// Initialise the in-memory knowledge store once per cold start
await initKnowledgeStore();

export const handler = serverless(app);
