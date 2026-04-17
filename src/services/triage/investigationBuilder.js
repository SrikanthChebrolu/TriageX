import { matchErrorPatterns } from './patternMatcher.js';

/**
 * buildInvestigationSteps — matches patterns against the incident and shapes
 * them into a numbered, de-duplicated step list.
 *
 * Steps from the primary pattern (highest keyword match) appear first.
 * Steps from secondary patterns are appended when not duplicated.
 *
 * @param {{ title: string, description: string }} incident
 * @returns {Array} ordered investigation steps
 */
export function buildInvestigationSteps(incident) {
  const matchedPatterns = matchErrorPatterns(incident);
  const seenActions     = new Set();
  const steps           = [];
  let   stepNumber      = 1;

  for (const pattern of matchedPatterns) {
    for (const rawStep of pattern.steps) {
      if (seenActions.has(rawStep.action)) continue;
      seenActions.add(rawStep.action);
      steps.push({
        step:          stepNumber++,
        action:        rawStep.action,
        rationale:     rawStep.rationale,
        logsToCheck:   rawStep.logsToCheck,
        errorPattern:  pattern.id,
        failureDomain: pattern.failureDomain,
      });
    }
  }
  return steps;
}
