import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/Card/Card';
import { SeverityBadge, ConfidenceBadge } from '../../components/Badge/Badge';
import { ServiceSelector } from '../../components/ServiceSelector/ServiceSelector';
import { ROOT_CAUSE_SCENARIOS } from '../../data/scenarios';
import type { Severity, RootCauseRequest, RootCauseResult, LogEntry, Alert, AlertAnalysis } from '../../types';
import styles from './RootCausePage.module.css';

const CONFIDENCE_FIELDS = [
  { key: 'logCorrelation'      as const, label: 'Log correlation',       max: 30 },
  { key: 'serviceCorrelation'  as const, label: 'Service correlation',   max: 25 },
  { key: 'historicalSimilarity'as const, label: 'Historical similarity', max: 30 },
  { key: 'convergenceBonus'    as const, label: 'Signal agreement',      max: 15 },
  { key: 'alertBonus'          as const, label: 'Alert signal bonus',    max: 20 },
];

export function RootCausePage(){
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [severity, setSeverity]   = useState<Severity>('HIGH');
  const [services, setServices]   = useState<string[]>([]);
  const [logsJson, setLogsJson]   = useState('');
  const [alertsJson, setAlertsJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('');

  const mutation = useMutation({ mutationFn: (req: RootCauseRequest) => api.suggestRootCause(req) });

  const activeScenario = ROOT_CAUSE_SCENARIOS.find(s => s.id === selectedScenario);

  function handleScenarioChange(id: string) {
    setSelectedScenario(id);
    if (!id) return;
    const sc = ROOT_CAUSE_SCENARIOS.find(s => s.id === id);
    if (sc) {
      setTitle(sc.title);
      setDesc(sc.description);
      setSeverity(sc.severity);
      setServices(sc.affectedServices);
      setLogsJson(JSON.stringify(sc.logs, null, 2));
      setAlertsJson(sc.alerts ? JSON.stringify(sc.alerts, null, 2) : '');
      setJsonError('');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJsonError('');

    let logs: LogEntry[];
    try { logs = JSON.parse(logsJson); }
    catch { setJsonError('Logs JSON is invalid — check the format.'); return; }
    if (!Array.isArray(logs) || logs.length === 0) {
      setJsonError('Logs must be a non-empty JSON array.');
      return;
    }

    let alerts: Alert[] | undefined;
    if (alertsJson.trim()) {
      try { alerts = JSON.parse(alertsJson); }
      catch { setJsonError('Alerts JSON is invalid — check the format.'); return; }
    }

    mutation.mutate({
      title,
      description,
      severity,
      affectedServices: services,
      logs,
      alerts,
    });
  }

  const result = mutation.data;

  return (
    <div className={styles.page}>
      <Card title="Root Cause Analysis">
        {/* Scenario picker */}
        <div className={styles.scenarioPicker}>
          <span className={styles.scenarioPickerLabel}>Load Scenario</span>
          <select
            className={styles.scenarioSelect}
            value={selectedScenario}
            onChange={e => handleScenarioChange(e.target.value)}
          >
            <option value="">— select a scenario —</option>
            {ROOT_CAUSE_SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
            ))}
          </select>
          {activeScenario?.alerts && (
            <span className={styles.scenarioAlertBadge}>+ alerts included</span>
          )}
          {activeScenario && (
            <span className={styles.scenarioDesc}>
              Severity: {activeScenario.severity} · Services: {activeScenario.affectedServices.join(', ')}
              {activeScenario.alerts ? ` · ${activeScenario.alerts.length} alert${activeScenario.alerts.length !== 1 ? 's' : ''} for deeper metrics` : ''}
            </span>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Title</label>
              <input
                className={styles.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Feed provider connection lost"
                required
              />
            </div>
            <div className={styles.field} style={{ maxWidth: 160 }}>
              <label className={styles.label}>Severity</label>
              <select className={styles.select} value={severity} onChange={e => setSeverity(e.target.value as Severity)}>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe the failure — symptoms, affected functionality, observed error messages..."
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Affected Services</label>
            <ServiceSelector value={services} onChange={setServices} />
            <span className={styles.servicesHint}>Type to search known services or add a custom one</span>
          </div>

          {/* Logs — REQUIRED */}
          <div className={styles.field}>
            <label className={styles.label}>
              Logs <span className={styles.required}>required</span>
            </label>
            <textarea
              className={`${styles.textarea} ${styles.logsTextarea}`}
              value={logsJson}
              onChange={e => setLogsJson(e.target.value)}
              placeholder='[{ "level": "ERROR", "message": "...", "service": "...", "timestamp": "..." }]'
              required
            />
            <span className={styles.servicesHint}>
              JSON array — each entry needs: level, message, service, timestamp. Include traceId for trace diagrams.
            </span>
          </div>

          {/* Alerts — OPTIONAL, unlocks deeper metrics */}
          <div className={styles.field}>
            <label className={styles.label}>
              Alerts <span className={styles.optional}>optional — unlocks deeper metrics</span>
            </label>
            <textarea
              className={`${styles.textarea} ${styles.logsTextarea}`}
              value={alertsJson}
              onChange={e => setAlertsJson(e.target.value)}
              placeholder='[{ "alertName": "...", "severity": "CRITICAL", "service": "...", "firedAt": "..." }]'
            />
            <span className={styles.servicesHint}>
              JSON array — each entry needs: alertName, severity, service, firedAt. Optional: description, value, threshold.
            </span>
          </div>

          {jsonError && <div className={styles.errorMsg}>{jsonError}</div>}

          <button className={styles.submitBtn} type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Analysing…' : 'Suggest Root Cause'}
          </button>
        </form>
      </Card>

      {mutation.isError && (
        <div className={styles.errorMsg}>{(mutation.error as Error).message}</div>
      )}

      {result && <RootCauseResult result={result} />}
    </div>
  );
}

function RootCauseResult({ result }: { result: RootCauseResult }){
  const {
    primaryHypothesis, alternativeHypotheses, confidenceScore,
    evidence, alertAnalysis, traceAnalysis, similarIncidents, summary,
  } = result;

  return (
    <div className={styles.results}>
      {/* Confidence metrics */}
      <div className={styles.confidenceRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Confidence</div>
          <div style={{ marginTop: 6 }}><ConfidenceBadge band={confidenceScore.band} /></div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Score</div>
          <div className={styles.metricValue}>{confidenceScore.total}</div>
          <div className={styles.metricSub}>/ 100</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Alert Bonus</div>
          <div className={styles.metricValue} style={{ color: confidenceScore.alertBonus > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
            +{confidenceScore.alertBonus}
          </div>
          <div className={styles.metricSub}>{confidenceScore.alertsUsed ? 'alerts provided' : 'no alerts'}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Traces Found</div>
          <div className={styles.metricValue}>{traceAnalysis.tracesFound}</div>
          <div className={styles.metricSub}>cross-service flows</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Evidence Items</div>
          <div className={styles.metricValue}>{evidence.length}</div>
          <div className={styles.metricSub}>signals correlated</div>
        </div>
      </div>

      {/* Confidence breakdown */}
      <Card title="Confidence Breakdown">
        {CONFIDENCE_FIELDS.map(({ key, label, max }) => {
          const val = confidenceScore[key];
          const isAlert = key === 'alertBonus';
          return (
            <div className={styles.breakdownRow} key={key}>
              <span className={styles.breakdownLabel}>
                {label} (max {max}){isAlert && !confidenceScore.alertsUsed ? ' — no alerts' : ''}
              </span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${(val / max) * 100}%`,
                    background: isAlert && val > 0 ? 'var(--accent)' : undefined,
                    opacity: isAlert && !confidenceScore.alertsUsed ? 0.3 : 1,
                  }}
                />
              </div>
              <span className={styles.breakdownPts}>{val}</span>
            </div>
          );
        })}
      </Card>

      {/* Alert deep metrics — only shown when alerts were provided */}
      {alertAnalysis && <AlertMetrics analysis={alertAnalysis} />}

      {/* Primary hypothesis */}
      {primaryHypothesis && (
        <Card title="Primary Root Cause Hypothesis">
          <div className={styles.hypothesisDomain}>{primaryHypothesis.failureDomain}</div>
          <div className={styles.hypothesis}>{primaryHypothesis.hypothesis}</div>
          {primaryHypothesis.remediation && (
            <div className={styles.remediation} style={{ marginTop: 10 }}>
              Remediation: {primaryHypothesis.remediation}
            </div>
          )}
          {primaryHypothesis.nextSteps && primaryHypothesis.nextSteps.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>NEXT STEPS</div>
              <div className={styles.nextSteps}>
                {primaryHypothesis.nextSteps.map((step, i) => (
                  <div className={styles.nextStep} key={i}>
                    <div className={styles.nextStepNum}>{i + 1}</div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Alternative hypotheses */}
      {alternativeHypotheses.length > 0 && (
        <Card title="Alternative Hypotheses">
          <div className={styles.altHypotheses}>
            {alternativeHypotheses.map(h => (
              <div className={styles.altHyp} key={h.patternId}>
                <div className={styles.altHypDomain}>{h.failureDomain}</div>
                {h.hypothesis}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Summary */}
      <Card title="AI Summary">
        <p className={styles.summary}>{summary}</p>
      </Card>

      {/* Evidence */}
      <Card title="Evidence">
        <div className={styles.evidenceList}>
          {evidence.map((ev, i) => (
            <div className={styles.evidenceItem} key={i}>
              <div className={`${styles.evidenceStrength} ${ev.strength === 'HIGH' ? styles.strengthHigh : ev.strength === 'MEDIUM' ? styles.strengthMedium : styles.strengthLow}`} />
              <div className={styles.evidenceBody}>
                <div className={styles.evidenceSource}>{ev.source.replace(/_/g, ' ')}</div>
                <div className={styles.evidenceDesc}>{ev.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Distributed trace diagrams */}
      {traceAnalysis.diagrams.length > 0 && (
        <Card title={`Distributed Trace Analysis (${traceAnalysis.tracesFound} trace${traceAnalysis.tracesFound !== 1 ? 's' : ''})`}>
          {traceAnalysis.diagrams.map(diag => (
            <div key={diag.traceId} style={{ marginBottom: 16 }}>
              <div className={styles.traceHeader}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{diag.traceId}</span>
                {diag.hasFailure && diag.failureOrigin && (
                  <span style={{ fontSize: 11, color: 'var(--error)', fontWeight: 600 }}>
                    Failure origin: {diag.failureOrigin}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{diag.eventCount} events · {diag.services.length} services</span>
              </div>
              <pre className={styles.diagram}>{diag.diagram}</pre>
            </div>
          ))}
        </Card>
      )}

      {/* Similar incidents */}
      <Card title="Similar Historical Incidents">
        <table className={styles.similarTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Severity</th>
              <th>Match</th>
              <th>Resolved (min)</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {similarIncidents.map(inc => (
              <tr key={inc.id}>
                <td className={styles.monoCell}>{inc.id}</td>
                <td>{inc.title}</td>
                <td><SeverityBadge severity={inc.severity} /></td>
                <td className={styles.monoCell}>{Math.round(inc.similarityScore * 100)}%</td>
                <td className={styles.monoCell}>{inc.resolvedInMin}</td>
                <td style={{ maxWidth: 280 }}>{inc.resolution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AlertMetrics({ analysis }: { analysis: AlertAnalysis }){
  const { alertCount, bySeverity, byService, dominantAlert, serviceOverlap, timeCorrelation, alertPatternMatches, alertScore, interpretation } = analysis;

  return (
    <Card title={`Alert Deep Metrics (${alertCount} alert${alertCount !== 1 ? 's' : ''} · +${alertScore} confidence pts)`}>
      <div className={styles.alertGrid}>

        {/* Summary row */}
        <div className={styles.alertSummaryRow}>
          <div className={styles.alertMetricBox}>
            <div className={styles.alertMetricLabel}>Total Alerts</div>
            <div className={styles.alertMetricValue}>{alertCount}</div>
          </div>
          {Object.entries(bySeverity).filter(([, v]) => v > 0).map(([sev, count]) => (
            <div className={styles.alertMetricBox} key={sev}>
              <div className={styles.alertMetricLabel}>{sev}</div>
              <div className={styles.alertMetricValue} style={{ color: `var(--severity-${sev.toLowerCase()})` }}>{count}</div>
            </div>
          ))}
          <div className={styles.alertMetricBox}>
            <div className={styles.alertMetricLabel}>Alert Bonus</div>
            <div className={styles.alertMetricValue} style={{ color: 'var(--accent)' }}>+{alertScore}</div>
          </div>
        </div>

        {/* Dominant alert */}
        <div className={styles.dominantAlert}>
          <span className={styles.dominantLabel}>Dominant Alert</span>
          <span className={styles.dominantName}>{dominantAlert.alertName}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{dominantAlert.service}</span>
        </div>

        {/* Service overlap — highest confidence signal */}
        {serviceOverlap.length > 0 && (
          <div className={styles.overlapBanner}>
            <span className={styles.overlapIcon}>⚠</span>
            <div>
              <div className={styles.overlapTitle}>Alert + Log Overlap Confirmed</div>
              <div className={styles.overlapSvcs}>{serviceOverlap.join(' · ')}</div>
              <div className={styles.overlapDesc}>These services have both fired alerts AND error logs — highest-confidence failure path.</div>
            </div>
          </div>
        )}

        {/* Interpretation */}
        <div className={styles.alertInterpretation}>{interpretation}</div>

        {/* Time correlation table */}
        <div>
          <div className={styles.subSectionTitle}>Time Correlation — Alert to Nearest Error Log</div>
          <table className={styles.correlationTable}>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Service</th>
                <th>Δ to nearest ERROR</th>
                <th>Strong?</th>
                <th>Nearest error log</th>
              </tr>
            </thead>
            <tbody>
              {timeCorrelation.map((t, i) => (
                <tr key={i}>
                  <td className={styles.monoCell}>{t.alertName}</td>
                  <td className={styles.monoCell}>{t.service}</td>
                  <td className={styles.monoCell}>{t.nearestErrorDeltaSec != null ? `${t.nearestErrorDeltaSec}s` : '—'}</td>
                  <td>
                    {t.nearestErrorDeltaSec != null && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.strongCorrelation ? 'var(--success)' : 'var(--text-muted)' }}>
                        {t.strongCorrelation ? '✓ YES' : 'NO'}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 240 }}>{t.nearestErrorLog ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pattern reinforcement */}
        {alertPatternMatches.length > 0 && (
          <div>
            <div className={styles.subSectionTitle}>Alert Pattern Reinforcement</div>
            <div className={styles.patternReinforcement}>
              {alertPatternMatches.map(m => (
                <div className={styles.patternMatch} key={m.patternId}>
                  <span className={styles.patternDomain}>{m.failureDomain}</span>
                  <span className={styles.patternHits}>{m.matchCount} alert keyword{m.matchCount !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By service */}
        <div>
          <div className={styles.subSectionTitle}>Alerts by Service</div>
          <div className={styles.serviceAlerts}>
            {Object.entries(byService).map(([svc, count]) => (
              <div className={styles.serviceAlertRow} key={svc}>
                <span className={`${styles.monoCell} ${serviceOverlap.includes(svc) ? styles.overlapService : ''}`}>{svc}</span>
                <span className={styles.monoCell}>{count} alert{count !== 1 ? 's' : ''}</span>
                {serviceOverlap.includes(svc) && <span className={styles.overlapTag}>+log overlap</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
