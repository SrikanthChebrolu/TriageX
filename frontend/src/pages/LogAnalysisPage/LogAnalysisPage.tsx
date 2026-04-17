import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/Card/Card';
import { LOG_SCENARIOS } from '../../data/scenarios';
import type { LogEntry, LogAnalysisResult, LogCluster } from '../../types';
import styles from './LogAnalysisPage.module.css';

export function LogAnalysisPage(){
  const [logsJson, setLogsJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('');

  const mutation = useMutation({ mutationFn: (logs: LogEntry[]) => api.analyzeLogs(logs) });

  const activeScenario = LOG_SCENARIOS.find(s => s.id === selectedScenario);

  function handleScenarioChange(id: string) {
    setSelectedScenario(id);
    if (!id) return;
    const sc = LOG_SCENARIOS.find(s => s.id === id);
    if (sc) {
      setLogsJson(JSON.stringify(sc.logs, null, 2));
      setJsonError('');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJsonError('');
    let logs: LogEntry[];
    try { logs = JSON.parse(logsJson); }
    catch { setJsonError('Invalid JSON — check the format.'); return; }
    if (!Array.isArray(logs)) { setJsonError('Expected a JSON array of log objects.'); return; }
    mutation.mutate(logs);
  }

  const result = mutation.data;

  return (
    <div className={styles.page}>
      <Card title="Log Ingestion & Analysis">
        {/* Scenario picker */}
        <div className={styles.scenarioPicker}>
          <span className={styles.scenarioPickerLabel}>Load Scenario</span>
          <select
            className={styles.scenarioSelect}
            value={selectedScenario}
            onChange={e => handleScenarioChange(e.target.value)}
          >
            <option value="">— select a scenario —</option>
            {LOG_SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
            ))}
          </select>
          {activeScenario && (
            <span className={styles.scenarioDesc}>{activeScenario.description}</span>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Log Entries (JSON array)</label>
            <textarea
              className={styles.textarea}
              value={logsJson}
              onChange={e => setLogsJson(e.target.value)}
              placeholder='[{ "level": "ERROR", "message": "...", "service": "...", "timestamp": "..." }]'
              required
            />
            {jsonError && <span style={{ color: 'var(--error)', fontSize: 11 }}>{jsonError}</span>}
            <span className={styles.hint}>
              Each entry: level (ERROR/WARN/INFO), message, service, timestamp, optional traceId + instance
            </span>
          </div>
          <div className={styles.actions}>
            <button className={styles.submitBtn} type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Analysing…' : 'Analyse Logs'}
            </button>
          </div>
        </form>
      </Card>

      {mutation.isError && (
        <div className={styles.errorMsg}>{(mutation.error as Error).message}</div>
      )}

      {result && <AnalysisResult result={result} />}
    </div>
  );
}

function AnalysisResult({ result }: { result: LogAnalysisResult }){
  const serviceEntries = Object.entries(result.byService);   // [serviceName, data]
  const windows        = Object.entries(result.byTimePeriod);
  const totalErrors    = serviceEntries.reduce((n, [, s]) => n + s.errorCount, 0);
  const spikes      = windows.filter(([, w]) => w.spikeDetected).length;

  return (
    <div className={styles.results}>
      {/* Metrics */}
      <div className={styles.metricRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Logs</div>
          <div className={styles.metricValue}>{result.totalLogs}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Services</div>
          <div className={styles.metricValue}>{serviceEntries.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Errors</div>
          <div className={styles.metricValue} style={{ color: totalErrors > 0 ? 'var(--error)' : 'inherit' }}>{totalErrors}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Anomalies</div>
          <div className={styles.metricValue} style={{ color: result.anomalies.length > 0 ? 'var(--warning)' : 'inherit' }}>{result.anomalies.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Windows</div>
          <div className={styles.metricValue}>{windows.length}</div>
          <div style={{ fontSize: 11, color: spikes > 0 ? 'var(--warning)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{spikes} spike{spikes !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Summary */}
      <Card title="AI Summary">
        <p className={styles.summary}>{result.summary}</p>
      </Card>

      {/* Anomalies */}
      {result.anomalies.length > 0 && (
        <Card title={`Anomalies (${result.anomalies.length})`}>
          <div className={styles.anomalyList}>
            {result.anomalies.map((a, i) => {
              const cls = a.severity === 'CRITICAL' ? styles.anomalyCritical
                : a.severity === 'HIGH' ? styles.anomalyHigh
                : a.severity === 'MEDIUM' ? styles.anomalyMedium
                : styles.anomalyLow;
              return (
                <div className={`${styles.anomaly} ${cls}`} key={i}>
                  <div className={styles.anomalyType}>{a.type}</div>
                  {a.description}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* By service */}
      <Card title="By Service">
        <table className={styles.serviceTable}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Total</th>
              <th>Errors</th>
              <th>Error Rate</th>
              <th>Clusters</th>
            </tr>
          </thead>
          <tbody>
            {serviceEntries.map(([serviceName, s]) => (
              <tr key={serviceName}>
                <td className={styles.monoCell}>{serviceName}</td>
                <td className={styles.monoCell}>{s.logCount}</td>
                <td className={styles.monoCell} style={{ color: s.errorCount > 0 ? 'var(--error)' : 'inherit' }}>{s.errorCount}</td>
                <td className={styles.monoCell}>{(s.errorRate * 100).toFixed(0)}%</td>
                <td className={styles.monoCell}>{s.clusters.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Time windows */}
      {windows.length > 0 && (
        <Card title="Time Windows (1-minute tumbling)">
          <div className={styles.windowList}>
            <div className={styles.windowRow} style={{ background: 'none', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', padding: '0 10px' }}>
              <span className={styles.windowTime}>WINDOW START</span>
              <span className={styles.windowLogs}>LOGS</span>
              <span className={styles.windowErrors}>ERRORS</span>
              <span className={styles.windowRate}>ERROR %</span>
              <span style={{ flex: 1 }}></span>
            </div>
            {windows.map(([key, w]) => (
              <div className={`${styles.windowRow} ${w.spikeDetected ? styles.windowSpike : ''}`} key={key}>
                <span className={styles.windowTime}>{w.windowStart.replace('T', ' ').slice(0, 19)}</span>
                <span className={styles.windowLogs}>{w.logCount}</span>
                <span className={styles.windowErrors}>{w.errorCount}</span>
                <span className={styles.windowRate}>{(w.errorRate * 100).toFixed(0)}%</span>
                <span style={{ flex: 1 }}>{w.spikeDetected && <span className={styles.spikeBadge}>spike</span>}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <UnusualPatterns result={result} />
    </div>
  );
}

// ── Unusual Patterns ──────────────────────────────────────────────────────────

function levelClass(level: string): string {
  if (level === 'FATAL') return styles.levelFatal;
  if (level === 'ERROR') return styles.levelError;
  if (level === 'WARN')  return styles.levelWarn;
  return styles.levelInfo;
}

function UnusualPatterns({ result }: { result: LogAnalysisResult }) {
  // Collect all clusters from all services, deduplicate by clusterId
  const clusterMap = new Map<string, LogCluster & { services: string[] }>();
  for (const [serviceName, svcData] of Object.entries(result.byService)) {
    for (const cluster of svcData.clusters) {
      const existing = clusterMap.get(cluster.clusterId);
      if (existing) {
        existing.services.push(serviceName);
      } else {
        clusterMap.set(cluster.clusterId, { ...cluster, services: [serviceName] });
      }
    }
  }

  // Repeating patterns: clusters with memberCount > 1, sorted by count desc
  const repeating = Array.from(clusterMap.values())
    .filter(c => c.memberCount > 1)
    .sort((a, b) => b.memberCount - a.memberCount);

  // Cross-service clusters: same cluster appears in multiple services
  const crossService = Array.from(clusterMap.values())
    .filter(c => c.services.length > 1)
    .sort((a, b) => b.services.length - a.services.length);

  // Historical matches from RAG retrieval — top 5 by similarity score
  const historicalMatches = [...result.retrievedContext]
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5);

  if (repeating.length === 0 && crossService.length === 0 && historicalMatches.length === 0) {
    return null;
  }

  return (
    <Card title="Unusual Patterns">
      <div className={styles.patternSection}>

        {/* Repeating message patterns */}
        {repeating.length > 0 && (
          <div className={styles.patternGroup}>
            <div className={styles.patternGroupTitle}>Repeating Message Patterns</div>
            <div className={styles.patternList}>
              {repeating.map(c => (
                <div className={styles.patternCard} key={c.clusterId}>
                  <div className={styles.patternCardHeader}>
                    <span className={styles.patternCount}>{c.memberCount}×</span>
                    <div className={styles.patternLevels}>
                      {c.levels.map(l => (
                        <span key={l} className={`${styles.levelBadge} ${levelClass(l)}`}>{l}</span>
                      ))}
                    </div>
                    <span className={styles.patternServices}>
                      {c.services.join(', ')}
                    </span>
                    <span className={styles.patternTime}>
                      {c.firstSeen.replace('T', ' ').slice(0, 19)}
                      {c.firstSeen !== c.lastSeen && (
                        <> → {c.lastSeen.replace('T', ' ').slice(11, 19)}</>
                      )}
                    </span>
                  </div>
                  <div className={styles.patternMessage}>{c.representativeMessage}</div>
                  {c.traceIds.length > 0 && (
                    <div className={styles.patternTraces}>
                      trace: {c.traceIds.slice(0, 3).join(', ')}{c.traceIds.length > 3 ? ` +${c.traceIds.length - 3} more` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cross-service cascade patterns */}
        {crossService.length > 0 && (
          <div className={styles.patternGroup}>
            <div className={styles.patternGroupTitle}>Cross-Service Cascades</div>
            <div className={styles.patternList}>
              {crossService.map(c => (
                <div className={`${styles.patternCard} ${styles.patternCardCascade}`} key={`cascade-${c.clusterId}`}>
                  <div className={styles.patternCardHeader}>
                    <span className={styles.cascadeIcon}>⇢</span>
                    <span className={styles.patternServices}>{c.services.join(' → ')}</span>
                    <span className={styles.patternCount}>{c.memberCount} occurrences</span>
                  </div>
                  <div className={styles.patternMessage}>{c.representativeMessage}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical similar incidents */}
        {historicalMatches.length > 0 && (
          <div className={styles.patternGroup}>
            <div className={styles.patternGroupTitle}>Historical Matches</div>
            <div className={styles.historyIncidents}>
              {historicalMatches.map(rc => {
                const inc = rc.incident;
                return (
                  <div className={styles.historyIncident} key={inc.id}>
                    <div className={styles.historyIncidentHeader}>
                      <span className={styles.historyIncidentId}>{inc.id}</span>
                      <span className={`${styles.severityBadge} ${styles['severity' + inc.severity]}`}>{inc.severity}</span>
                      <span className={styles.historySimilarity}>{Math.round(rc.similarityScore * 100)}% match</span>
                      <span className={styles.historyResolved}>{inc.resolvedInMin}m to resolve</span>
                    </div>
                    <div className={styles.historyTitle}>{inc.title}</div>
                    <div className={styles.historyMeta}>
                      <span className={styles.historyLabel}>Root cause</span> {inc.rootCause}
                    </div>
                    <div className={styles.historyMeta}>
                      <span className={styles.historyLabel}>Resolution</span> {inc.resolution}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
