import { validateRootCauseRequest }  from './validator.js';
import { correlateSignals }           from './signalCorrelator.js';
import { computeConfidenceScore }     from './confidenceScorer.js';
import { buildEvidence }              from './evidenceBuilder.js';
import { extractTraceFlows }          from './traceExtractor.js';
import { renderTraceFlows }           from './diagramRenderer.js';
import { analyzeAlerts }              from './alertAnalyzer.js';
import { retrieveRelevantIncidents }  from '../rag/retriever.js';
import { getRootCauseLLMProvider }    from '../llm/index.js';

/**
 * suggestRootCause — main entry point for root-cause analysis (Requirement 03).
 *
 * Pipeline:
 *  1.  Validate — logs REQUIRED, alerts OPTIONAL
 *  2.  RAG — retrieve top similar historical incidents
 *  3.  Correlate three independent signals (pattern, log, historical)
 *  4.  Alert analysis — deep metrics when alerts are provided (step skipped otherwise)
 *  5.  Confidence score — base score + alert bonus when alerts present
 *  6.  Extract distributed trace flows from logs
 *  7.  Render ASCII call-chain diagrams
 *  8.  Build human-readable evidence list (includes alert evidence when present)
 *  9.  Generate root-cause summary via LLM provider
 *  10. Return structured recommendation
 *
 * @param {object} rawRequest - raw request body
 * @returns {object} root cause result
 */
export async function suggestRootCause(rawRequest) {
  // 1. Validate (logs required, alerts optional)
  const incident = validateRootCauseRequest(rawRequest);

  // 2. RAG
  const query   = `${incident.title} ${incident.description}`;
  const similar = await retrieveRelevantIncidents(query);

  // 3. Correlate signals (pattern matching + log-level + historical)
  const signals = correlateSignals(incident, similar);

  // 4. Alert analysis — only when alerts were provided
  const alertAnalysis = incident.alerts !== null
    ? analyzeAlerts(incident.alerts, incident.logs, signals.patternMatches)
    : null;

  // 5. Confidence score — includes alert bonus when alerts present
  const confidenceScore = computeConfidenceScore(signals, alertAnalysis);

  // 6. Extract trace flows from logs
  const traceFlows = extractTraceFlows(incident.logs);

  // 7. Render ASCII diagrams
  const traceDiagrams = renderTraceFlows(traceFlows);

  // 8. Build evidence list (alert evidence appended when alerts present)
  const evidence = buildEvidence(signals, incident, alertAnalysis);

  // 9. LLM summary (mock)
  const llm     = getRootCauseLLMProvider();
  const summary = await llm.analyze(
    { incident, signals, confidenceScore, evidence, alertAnalysis },
    similar
  );

  // 10. Shape response
  return {
    analysisId:  `rc-${Date.now()}`,
    receivedAt:  new Date().toISOString(),

    primaryHypothesis: signals.patternMatches[0]
      ? {
          patternId:     signals.patternMatches[0].patternId,
          failureDomain: signals.patternMatches[0].failureDomain,
          hypothesis:    signals.patternMatches[0].hypothesis,
          remediation:   signals.patternMatches[0].remediation,
          nextSteps:     signals.patternMatches[0].nextSteps,
        }
      : null,

    alternativeHypotheses: signals.patternMatches.slice(1).map(p => ({
      patternId:     p.patternId,
      failureDomain: p.failureDomain,
      hypothesis:    p.hypothesis,
    })),

    confidenceScore,
    evidence,

    // Alert deep metrics — only present when alerts were provided
    alertAnalysis,

    traceAnalysis: {
      tracesFound: traceDiagrams.length,
      diagrams:    traceDiagrams,
    },

    similarIncidents: similar.map(({ incident: inc, similarityScore }) => ({
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
