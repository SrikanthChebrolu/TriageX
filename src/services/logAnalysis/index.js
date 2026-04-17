import { validateAndNormalize }       from './validator.js';
import { buildVectorStore }           from './embedder.js';
import { clusterBySimilarity }        from './clusterer.js';
import { groupByService }             from './groupByService.js';
import { groupByTimePeriod }          from './groupByTimePeriod.js';
import { detectAnomalies }            from './anomalyDetector.js';
import { generateSummary }            from './summarizer.js';
import { retrieveContextForAnalysis } from '../rag/retriever.js';
import { getLLMProvider }             from '../llm/index.js';
import { ERROR_LEVELS }               from '../../constants.js';

/**
 * analyzeLogs — main entry point for log ingestion & analysis (Requirement 01).
 *
 * Pipeline:
 *  1. Validate & normalise incoming logs
 *  2. Embed log messages into an in-memory vector store
 *  3. Cluster logs by semantic similarity (cosine distance on embeddings)
 *  4. Group by service — counts, error rates, cluster membership
 *  5. Compute batch-level error rate (used as spike-detection baseline)
 *  6. Group by 1-minute tumbling windows — flag spikes
 *  7. Detect anomalies (spike / fatal burst / single-service dominance)
 *  8. RAG — retrieve relevant historical incidents from KnowledgeStore
 *  9. Generate augmented summary via LLM provider (mock by default)
 *
 * @param {Array} rawLogs - raw log entries from the request body
 * @returns {object} full analysis result
 */
export async function analyzeLogs(rawLogs) {
  // 1. Validate and normalise
  const logs = validateAndNormalize(rawLogs);

  // 2. Embed into per-request vector store
  const vectorStore = await buildVectorStore(logs);

  // 3. Cluster by semantic similarity
  const clusters = await clusterBySimilarity(logs, vectorStore);

  // 4. Group by service
  const byService = groupByService(logs, clusters);

  // 5. Compute batch error rate baseline
  const totalErrors    = logs.filter(l => ERROR_LEVELS.has(l.level)).length;
  const batchErrorRate = logs.length > 0 ? totalErrors / logs.length : 0;

  // 6. Group by time windows, flag spikes
  const byTimePeriod = groupByTimePeriod(logs, batchErrorRate);

  // 7. Detect anomalies
  const anomalies = detectAnomalies(logs, byTimePeriod, byService, batchErrorRate);

  // 8. RAG — retrieve matching historical incidents
  const retrievedContext = await retrieveContextForAnalysis(clusters);

  // 9. Generate summary (mock LLM — real LLM plug-in point)
  const llm     = getLLMProvider();
  const summary = await llm.analyze(
    { totalLogs: logs.length, byService, byTimePeriod, anomalies },
    retrievedContext
  );

  return {
    totalLogs:      logs.length,
    analyzedAt:     new Date().toISOString(),
    byService,
    byTimePeriod,
    anomalies,
    retrievedContext,
    summary,
  };
}
