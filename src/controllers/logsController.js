import { analyzeLogs as analyzeLogService } from '../services/logAnalysis/index.js';

/**
 * analyzeLogs — POST /api/v1/logs/analyze
 *
 * Accepts a batch of log entries and returns:
 *  - semantic clusters (similar error messages grouped)
 *  - grouping by service and time window
 *  - anomaly detection (error spikes)
 *  - LLM-generated summary
 *  - similar past incidents from KnowledgeStore
 */
export async function analyzeLogs(req, res, next) {
  try {
    // Body is { logs: [...] }; validator expects the raw array
    const logs   = Array.isArray(req.body) ? req.body : req.body?.logs;
    const result = await analyzeLogService(logs);
    res.status(200).json({
      data:  result,
      error: null,
      meta:  { timestamp: new Date().toISOString(), version: 'v1' },
    });
  } catch (err) {
    next(err);
  }
}
