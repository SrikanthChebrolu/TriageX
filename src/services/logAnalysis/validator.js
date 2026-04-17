import { AppError }   from '../../middleware/errorHandler.js';
import { LOG_LEVELS } from '../../constants.js';

/**
 * validateAndNormalize — validates each log entry and normalises fields.
 * Throws AppError(422) on the first invalid entry.
 *
 * @param {Array} rawLogs - raw request body logs array
 * @returns {Array} normalised log entries
 */
export function validateAndNormalize(rawLogs) {
  if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
    throw new AppError('logs must be a non-empty array.', 422);
  }
  if (rawLogs.length > 500) {
    throw new AppError('logs must contain 500 entries or fewer.', 422);
  }

  return rawLogs.map((log, i) => {
    const prefix = `logs[${i}]`;

    if (!log.timestamp || isNaN(Date.parse(log.timestamp))) {
      throw new AppError(`${prefix}.timestamp must be a valid ISO 8601 string.`, 422);
    }
    if (!LOG_LEVELS.includes(log.level)) {
      throw new AppError(`${prefix}.level must be one of: ${LOG_LEVELS.join(', ')}.`, 422);
    }
    if (!log.service || typeof log.service !== 'string' || !log.service.trim()) {
      throw new AppError(`${prefix}.service is required.`, 422);
    }
    if (!log.message || typeof log.message !== 'string' || !log.message.trim()) {
      throw new AppError(`${prefix}.message is required.`, 422);
    }

    return {
      timestamp: log.timestamp,
      level:     log.level,
      service:   log.service.trim(),
      message:   log.message.trim(),
      traceId:   log.traceId ?? null,
      instance:  log.instance ?? log.service,
    };
  });
}
