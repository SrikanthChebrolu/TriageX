import { validateIncident }                          from './validator.js';
import { computePriorityScore, scoreToPriorityBand } from './priorityScorer.js';
import { buildInvestigationSteps }                   from './investigationBuilder.js';
import { retrieveRelevantIncidents }                 from '../rag/retriever.js';
import { getTriageLLMProvider }                      from '../llm/index.js';

/**
 * triageIncident — main entry point for incident triage (Requirement 02).
 *
 * Pipeline:
 *  1. Validate and normalise the incoming incident
 *  2. RAG — retrieve top similar historical incidents from KnowledgeStore
 *  3. Compute priority score (severity + services + similarity + time of day)
 *  4. Generate investigation steps via error pattern matching
 *  5. Generate triage summary via LLM provider (mock by default)
 *  6. Return structured triage recommendation
 *
 * @param {object} rawIncident - raw request body
 * @returns {object} triage result
 */
export async function triageIncident(rawIncident) {
  // 1. Validate
  const incident = validateIncident(rawIncident);

  // 2. RAG — find similar past incidents
  const query            = `${incident.title} ${incident.description}`;
  const similarIncidents = await retrieveRelevantIncidents(query);

  // 3. Priority score — top similarity score feeds into the formula
  const topSimilarityScore = similarIncidents[0]?.similarityScore ?? 0;
  const scoreBreakdown     = computePriorityScore(incident, topSimilarityScore);
  const priorityBand       = scoreToPriorityBand(scoreBreakdown.total);

  // 4. Investigation steps via pattern matching
  const investigationSteps = buildInvestigationSteps(incident);

  // 5. LLM summary (mock)
  const llm     = getTriageLLMProvider();
  const summary = await llm.analyze(
    { incident, scoreBreakdown, priorityBand, investigationSteps },
    similarIncidents
  );

  // 6. Shape response
  return {
    incidentId:       `triage-${Date.now()}`,
    receivedAt:       new Date().toISOString(),
    priorityScore:    scoreBreakdown.total,
    priorityBand,
    scoreBreakdown,
    investigationSteps,
    similarIncidents: similarIncidents.map(({ incident: inc, similarityScore }) => ({
      id:            inc.id,
      title:         inc.title,
      similarityScore,
      severity:      inc.severity,
      rootCause:     inc.rootCause,
      resolution:    inc.resolution,
      resolvedInMin: inc.resolvedInMin,
    })),
    summary,
  };
}
