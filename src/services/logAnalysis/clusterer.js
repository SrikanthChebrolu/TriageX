import { SIMILARITY_THRESHOLD } from '../../constants.js';

/**
 * clusterBySimilarity — groups log messages by semantic similarity using union-find.
 *
 * For each log, we query the vector store for its k nearest neighbours.
 * Any pair scoring above SIMILARITY_THRESHOLD gets merged into the same cluster.
 *
 * @param {Array}             logs        - normalised log entries
 * @param {MemoryVectorStore} vectorStore - the per-request store built in embedder.js
 * @returns {Array} clusters
 */
export async function clusterBySimilarity(logs, vectorStore) {
  // --- Union-Find helpers ---
  const parent = logs.map((_, i) => i);

  function find(i) {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(i, j) { parent[find(i)] = find(j); }

  // --- Find neighbours for each log and union similar pairs ---
  for (let i = 0; i < logs.length; i++) {
    const neighbours = await vectorStore.similaritySearchWithScore(logs[i].message, 10);
    for (const [doc, score] of neighbours) {
      const j = logs.findIndex(l => l.message === doc.pageContent && l.timestamp === doc.metadata.timestamp);
      if (j !== -1 && j !== i && score >= SIMILARITY_THRESHOLD) {
        union(i, j);
      }
    }
  }

  // --- Group logs by their cluster root ---
  const clusterMap = new Map();
  for (let i = 0; i < logs.length; i++) {
    const root = find(i);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root).push(i);
  }

  // --- Shape each cluster for output ---
  return Array.from(clusterMap.values()).map((members, idx) => {
    const memberLogs = members.map(i => logs[i]);
    return {
      clusterId:             `c-${String(idx + 1).padStart(3, '0')}`,
      representativeMessage: memberLogs[0].message,
      memberCount:           members.length,
      levels:                [...new Set(memberLogs.map(l => l.level))],
      traceIds:              memberLogs.map(l => l.traceId).filter(Boolean),
      firstSeen:             memberLogs[0].timestamp,
      lastSeen:              memberLogs[memberLogs.length - 1].timestamp,
    };
  });
}
