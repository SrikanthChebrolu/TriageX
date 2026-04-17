import { AppError }        from '../../middleware/errorHandler.js';
import { SEVERITY_LEVELS } from '../../constants.js';

/**
 * validateIncident — validates and normalises an incoming incident object.
 * Throws AppError(422) on invalid input.
 */
export function validateIncident(raw) {
  if (!raw || typeof raw !== 'object') throw new AppError('Request body must be a JSON object.', 422);

  if (!raw.title?.trim())       throw new AppError('title is required.',       422);
  if (!raw.description?.trim()) throw new AppError('description is required.', 422);
  if (!SEVERITY_LEVELS.includes(raw.severity)) {
    throw new AppError(`severity must be one of: ${SEVERITY_LEVELS.join(', ')}.`, 422);
  }
  if (!Array.isArray(raw.affectedServices) || raw.affectedServices.length === 0) {
    throw new AppError('affectedServices must be a non-empty array.', 422);
  }

  return {
    title:            raw.title.trim(),
    description:      raw.description.trim(),
    affectedServices: raw.affectedServices.map(s => String(s).trim()),
    severity:         raw.severity,
  };
}
