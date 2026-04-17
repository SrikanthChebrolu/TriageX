import { ERROR_PATTERNS } from './errorPatterns.js';

/**
 * matchErrorPatterns — scores each pattern by keyword frequency in the incident text.
 *
 * Returns the top 3 matching patterns sorted by match count descending.
 * Falls back to the 'unknown' pattern if nothing matches.
 *
 * @param {{ title: string, description: string }} incident
 * @returns {Array} matched patterns
 */
export function matchErrorPatterns(incident) {
  const text = `${incident.title} ${incident.description}`.toLowerCase();

  const scored = ERROR_PATTERNS
    .filter(p => p.id !== 'unknown')
    .map(pattern => ({
      pattern,
      matchCount: pattern.keywords.filter(kw => text.includes(kw)).length,
    }))
    .filter(({ matchCount }) => matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);

  if (scored.length === 0) {
    return [ERROR_PATTERNS.find(p => p.id === 'unknown')];
  }
  return scored.slice(0, 3).map(({ pattern }) => pattern);
}
