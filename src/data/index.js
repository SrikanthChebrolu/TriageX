import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import { readFileSync }   from 'fs';

// Resolve JSON files relative to this module (ESM-safe, no import assertions needed)
const __filename = fileURLToPath(import.meta.url);
const __dir      = dirname(__filename);

function loadJSON(filename) {
  const path = join(__dir, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// Load once at module init — these files are small seed data
const _incidents       = loadJSON('incidents.json');
const _logs            = loadJSON('logs.json');
const _serviceTopology = loadJSON('serviceTopology.json');

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
 * Useful for the log analysis endpoint when seeding the per-request vector store.
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
