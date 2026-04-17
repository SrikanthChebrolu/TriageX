// Static imports — esbuild inlines these at bundle time, no runtime fs access needed
import _incidents       from './incidents.json'       with { type: 'json' };
import _logs            from './logs.json'            with { type: 'json' };
import _serviceTopology from './serviceTopology.json' with { type: 'json' };

/**
 * getHistoricalIncidents — returns a fresh copy of seed incidents.
 * Always returns a new array so callers cannot mutate the module-level data.
 */
export function getHistoricalIncidents() {
  return _incidents.map(inc => ({ ...inc }));
}

/**
 * getLogScenarios — returns all seed log scenarios.
 * Each scenario has: { scenario, description, logs[] }
 */
export function getLogScenarios() {
  return _logs.map(s => ({
    ...s,
    logs: s.logs.map(l => ({ ...l })),
  }));
}

/**
 * getAllLogs — flattens all scenarios into a single log array.
 */
export function getAllLogs() {
  return _logs.flatMap(s => s.logs.map(l => ({ ...l })));
}

/**
 * getServiceTopology — returns the service graph.
 */
export function getServiceTopology() {
  return {
    services: _serviceTopology.services.map(svc => ({ ...svc })),
  };
}

/**
 * getServiceById — looks up a single service definition by its id.
 */
export function getServiceById(id) {
  return _serviceTopology.services.find(s => s.id === id) ?? null;
}
