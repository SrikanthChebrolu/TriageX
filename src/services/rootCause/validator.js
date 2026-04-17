import { AppError } from '../../middleware/errorHandler.js';

const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * validateRootCauseRequest — validates and normalises the incoming root-cause request.
 *
 * Required: title, description, severity, affectedServices (non-empty array), logs (non-empty array)
 * Optional: alerts (array of fired alert objects)
 *
 * Logs are MANDATORY — root-cause analysis requires observed log evidence.
 * Alerts are OPTIONAL — when provided, deeper correlation metrics are produced.
 *
 * @param {object} raw
 * @returns {object} normalised incident with logs and optional alerts
 */
export function validateRootCauseRequest(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  const { title, description, severity, affectedServices, logs, alerts } = raw;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new AppError('Field "title" is required and must be a non-empty string.', 422);
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    throw new AppError('Field "description" is required and must be a non-empty string.', 422);
  }
  if (!severity || !VALID_SEVERITIES.includes(severity)) {
    throw new AppError(`Field "severity" must be one of: ${VALID_SEVERITIES.join(', ')}.`, 422);
  }
  if (!Array.isArray(affectedServices) || affectedServices.length === 0) {
    throw new AppError('Field "affectedServices" must be a non-empty array of service names.', 422);
  }

  // logs are REQUIRED for root-cause analysis
  if (!Array.isArray(logs) || logs.length === 0) {
    throw new AppError(
      'Field "logs" is required and must be a non-empty array. ' +
      'Root-cause analysis requires observed log evidence from the affected services.',
      422
    );
  }

  const normalisedLogs = logs.map((log, i) => {
    if (typeof log !== 'object' || !log) {
      throw new AppError(`logs[${i}] must be an object.`, 422);
    }
    return {
      level:     (log.level   ?? 'INFO').toUpperCase(),
      message:   log.message  ?? '',
      service:   log.service  ?? 'unknown',
      timestamp: log.timestamp ?? new Date().toISOString(),
      traceId:   log.traceId  ?? null,
      instance:  log.instance ?? null,
    };
  });

  // alerts are OPTIONAL — validate only if provided
  const normalisedAlerts = Array.isArray(alerts)
    ? alerts.map((alert, i) => {
        if (typeof alert !== 'object' || !alert) {
          throw new AppError(`alerts[${i}] must be an object.`, 422);
        }
        return {
          alertName:   alert.alertName   ?? alert.name   ?? `ALERT-${i}`,
          severity:    (alert.severity   ?? 'HIGH').toUpperCase(),
          service:     alert.service     ?? 'unknown',
          firedAt:     alert.firedAt     ?? alert.timestamp ?? new Date().toISOString(),
          description: alert.description ?? '',
          value:       alert.value       ?? null,   // metric value that triggered the alert
          threshold:   alert.threshold   ?? null,   // threshold that was breached
        };
      })
    : null;   // null = no alerts provided (different from empty array)

  return {
    title:            title.trim(),
    description:      description.trim(),
    severity,
    affectedServices: affectedServices.map(String),
    logs:             normalisedLogs,
    alerts:           normalisedAlerts,
  };
}
