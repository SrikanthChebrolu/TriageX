// Static imports — esbuild inlines these at bundle time, no runtime fs access needed
import _incidents from './incidents.json' with { type: 'json' };

/**
 * getHistoricalIncidents — returns a fresh copy of seed incidents.
 * Always returns a new array so callers cannot mutate the module-level data.
 */
export function getHistoricalIncidents() {
  return _incidents.map(inc => ({ ...inc }));
}
