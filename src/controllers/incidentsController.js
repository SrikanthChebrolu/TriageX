import { triageIncident }   from '../services/triage/index.js';
import { suggestRootCause } from '../services/rootCause/index.js';

/**
 * triage — POST /api/v1/incidents/triage
 *
 * Accepts a raw incident and returns:
 *  - composite priority score (0–100) and priority band (P1–P4)
 *  - investigation steps derived from error pattern matching
 *  - similar past incidents from KnowledgeStore
 *  - LLM-generated triage summary
 */
export async function triage(req, res, next) {
  try {
    const result = await triageIncident(req.body);
    res.status(200).json({
      data:  result,
      error: null,
      meta:  { timestamp: new Date().toISOString(), version: 'v1' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * rootCause — POST /api/v1/incidents/root-cause
 *
 * Accepts an incident (optionally with logs) and returns:
 *  - primary root cause hypothesis with confidence score
 *  - alternative hypotheses
 *  - evidence from three independent signals
 *  - distributed trace ASCII diagrams (when logs with traceId are provided)
 *  - similar past incidents and next steps for the engineer
 */
export async function rootCause(req, res, next) {
  try {
    const result = await suggestRootCause(req.body);
    res.status(200).json({
      data:  result,
      error: null,
      meta:  { timestamp: new Date().toISOString(), version: 'v1' },
    });
  } catch (err) {
    next(err);
  }
}
