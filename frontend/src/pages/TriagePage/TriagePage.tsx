import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/Card/Card';
import { SeverityBadge, PriorityBadge } from '../../components/Badge/Badge';
import { ServiceSelector } from '../../components/ServiceSelector/ServiceSelector';
import { TRIAGE_SCENARIOS } from '../../data/scenarios';
import type { Severity, TriageRequest, TriageResult } from '../../types';
import styles from './TriagePage.module.css';

const SCORE_FIELDS: Array<{ key: keyof TriageResult['scoreBreakdown']; label: string; max: number }> = [
  { key: 'severityScore',         label: 'Severity',          max: 30 },
  { key: 'affectedServicesScore', label: 'Affected services',  max: 25 },
  { key: 'similarityScore',       label: 'Historical match',   max: 30 },
  { key: 'timeOfDayScore',        label: 'Time of day',        max: 15 },
];

export function TriagePage(){
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [services, setServices] = useState<string[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');

  const mutation = useMutation({ mutationFn: (req: TriageRequest) => api.triageIncident(req) });

  function handleScenarioChange(id: string) {
    setSelectedScenario(id);
    if (!id) return;
    const sc = TRIAGE_SCENARIOS.find(s => s.id === id);
    if (sc) {
      setTitle(sc.title);
      setDesc(sc.description);
      setSeverity(sc.severity);
      setServices(sc.affectedServices);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      title,
      description,
      severity,
      affectedServices: services,
    });
  }

  const result = mutation.data;

  return (
    <div className={styles.page}>
      <Card title="Incident Triage">
        {/* Scenario picker */}
        <div className={styles.scenarioPicker}>
          <span className={styles.scenarioPickerLabel}>Load Scenario</span>
          <select
            className={styles.scenarioSelect}
            value={selectedScenario}
            onChange={e => handleScenarioChange(e.target.value)}
          >
            <option value="">— select an incident scenario —</option>
            {TRIAGE_SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.id} · {s.title}</option>
            ))}
          </select>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Title</label>
              <input
                className={styles.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Stale prices on all instruments"
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
              placeholder="Describe the incident — error messages, observed symptoms, affected functionality..."
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Affected Services</label>
            <ServiceSelector value={services} onChange={setServices} />
            <span className={styles.servicesHint}>Type to search known services or add a custom one</span>
          </div>
          <button className={styles.submitBtn} type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Triaging…' : 'Triage Incident'}
          </button>
        </form>
      </Card>

      {mutation.isError && (
        <div className={styles.errorMsg}>{(mutation.error as Error).message}</div>
      )}

      {result && <TriageResult result={result} />}
    </div>
  );
}

function TriageResult({ result }: { result: TriageResult }){
  return (
    <div className={styles.results}>
      {/* Score overview */}
      <div className={styles.scoreRow}>
        <div className={styles.scoreCard}>
          <div className={styles.scoreLabel}>Priority</div>
          <div style={{ marginTop: 6 }}><PriorityBadge band={result.priorityBand} /></div>
        </div>
        <div className={styles.scoreCard}>
          <div className={styles.scoreLabel}>Score</div>
          <div className={styles.scoreValue}>{result.priorityScore}</div>
          <div className={styles.scoreSub}>/ 100</div>
        </div>
        <div className={styles.scoreCard}>
          <div className={styles.scoreLabel}>Investigation Steps</div>
          <div className={styles.scoreValue}>{result.investigationSteps.length}</div>
          <div className={styles.scoreSub}>actions generated</div>
        </div>
        <div className={styles.scoreCard}>
          <div className={styles.scoreLabel}>Similar Incidents</div>
          <div className={styles.scoreValue}>{result.similarIncidents.length}</div>
          <div className={styles.scoreSub}>from knowledge base</div>
        </div>
      </div>

      {/* Score breakdown */}
      <Card title="Score Breakdown">
        <div className={styles.breakdown}>
          {SCORE_FIELDS.map(({ key, label, max }) => (
            <div className={styles.breakdownRow} key={key}>
              <span className={styles.breakdownLabel}>{label} (max {max})</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(result.scoreBreakdown[key] / max) * 100}%` }}
                />
              </div>
              <span className={styles.breakdownPts}>{result.scoreBreakdown[key]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card title="AI Summary">
        <p className={styles.summary}>{result.summary}</p>
      </Card>

      {/* Investigation steps */}
      <Card title={`Investigation Steps (${result.investigationSteps.length})`}>
        <div className={styles.steps}>
          {result.investigationSteps.map(step => (
            <div className={styles.step} key={step.step}>
              <div className={styles.stepNum}>{step.step}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepAction}>{step.action}</div>
                <div className={styles.stepRationale}>{step.rationale}</div>
                <div className={styles.stepLogs}>
                  {step.logsToCheck.map(log => (
                    <span className={styles.stepLog} key={log}>{log}</span>
                  ))}
                </div>
                <div className={styles.stepMeta}>Pattern: {step.errorPattern} · Domain: {step.failureDomain}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

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
              <th>Root Cause</th>
            </tr>
          </thead>
          <tbody>
            {result.similarIncidents.map(inc => (
              <tr key={inc.id}>
                <td className={styles.monoCell}>{inc.id}</td>
                <td>{inc.title}</td>
                <td><SeverityBadge severity={inc.severity} /></td>
                <td className={styles.monoCell}>{Math.round(inc.similarityScore * 100)}%</td>
                <td className={styles.monoCell}>{inc.resolvedInMin}</td>
                <td style={{ maxWidth: 280 }}>{inc.rootCause}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
