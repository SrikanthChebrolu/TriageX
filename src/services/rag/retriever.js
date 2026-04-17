import { getKnowledgeStore } from './knowledgeStore.js';
import { TOP_K_RETRIEVAL }   from '../../constants.js';

/**
 * retrieveRelevantIncidents — finds the top-K historical incidents
 * most semantically similar to a given query string.
 *
 * @param {string} query - free-text query (title + description of current incident)
 * @returns {Array<{ similarityScore: number, incident: object }>}
 */
export async function retrieveRelevantIncidents(query) {
  const store   = getKnowledgeStore();
  const results = await store.similaritySearchWithScore(query, TOP_K_RETRIEVAL);
  return results.map(([doc, score]) => ({
    similarityScore: Number(score.toFixed(3)),
    incident:        doc.metadata,
  }));
}

/**
 * retrieveContextForAnalysis — runs retrieval for each log cluster's
 * representative message and de-duplicates across clusters.
 *
 * @param {Array<{ representativeMessage: string }>} clusters
 * @returns {Array<{ similarityScore: number, incident: object }>}
 */
export async function retrieveContextForAnalysis(clusters) {
  const seen    = new Set();
  const context = [];

  for (const cluster of clusters) {
    const results = await retrieveRelevantIncidents(cluster.representativeMessage);
    for (const result of results) {
      const id = result.incident.id;
      if (!seen.has(id)) {
        seen.add(id);
        context.push(result);
      }
    }
  }

  return context.sort((a, b) => b.similarityScore - a.similarityScore);
}
