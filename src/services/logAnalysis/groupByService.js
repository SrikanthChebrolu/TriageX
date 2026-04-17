import { ERROR_LEVELS } from '../../constants.js';

/**
 * groupByService — buckets clusters and log counts by service name.
 *
 * @param {Array} logs     - normalised log entries
 * @param {Array} clusters - output of clusterBySimilarity
 * @returns {Record<string, { logCount, errorCount, errorRate, clusters[] }>}
 */
export function groupByService(logs, clusters) {
  // Build a lookup: message → cluster (representative message is cluster key)
  const msgToCluster = new Map();
  for (const cluster of clusters) {
    msgToCluster.set(cluster.representativeMessage, cluster);
  }

  // Bucket logs by service
  const serviceMap = new Map();
  for (const log of logs) {
    if (!serviceMap.has(log.service)) {
      serviceMap.set(log.service, { logs: [], clusterSet: new Set() });
    }
    const bucket = serviceMap.get(log.service);
    bucket.logs.push(log);
    const cluster = msgToCluster.get(log.message);
    if (cluster) bucket.clusterSet.add(cluster);
  }

  // Shape output
  const result = {};
  for (const [service, { logs: svcLogs, clusterSet }] of serviceMap) {
    const errorCount = svcLogs.filter(l => ERROR_LEVELS.has(l.level)).length;
    result[service] = {
      logCount:   svcLogs.length,
      errorCount,
      errorRate:  Number((errorCount / svcLogs.length).toFixed(2)),
      clusters:   [...clusterSet],
    };
  }
  return result;
}
