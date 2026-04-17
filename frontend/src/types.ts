export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PriorityBand = 'P1' | 'P2' | 'P3' | 'P4';
export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

// ── Log Analysis ─────────────────────────────────────────────────────────────

export interface LogEntry {
  level:      string;
  message:    string;
  service:    string;
  timestamp:  string;
  traceId?:   string;
  instance?:  string;
}

export interface LogAnalysisResult {
  totalLogs:        number;
  analyzedAt:       string;
  byService:        Record<string, ServiceGroup>;
  byTimePeriod:     Record<string, TimePeriod>;
  anomalies:        Anomaly[];
  retrievedContext: RetrievedContext[];
  summary:          string;
}

export interface LogCluster {
  clusterId:             string;
  representativeMessage: string;
  memberCount:           number;
  levels:                string[];
  traceIds:              string[];
  firstSeen:             string;
  lastSeen:              string;
}

export interface ServiceGroup {
  logCount:   number;
  errorCount: number;
  errorRate:  number;
  clusters:   LogCluster[];
}

export interface TimePeriod {
  windowStart:   string;
  windowEnd:     string;
  logCount:      number;
  errorCount:    number;
  errorRate:     number;
  spikeDetected: boolean;
  services:      string[];
}

export interface Anomaly {
  type:        string;
  severity:    string;
  description: string;
  affectedServices?: string[];
  window?:     string;
}

export interface RetrievedContext {
  similarityScore: number;
  incident:        SimilarIncident;
}

// ── Triage ───────────────────────────────────────────────────────────────────

export interface TriageRequest {
  title:            string;
  description:      string;
  severity:         Severity;
  affectedServices: string[];
}

export interface TriageResult {
  incidentId:        string;
  receivedAt:        string;
  priorityScore:     number;
  priorityBand:      PriorityBand;
  scoreBreakdown:    ScoreBreakdown;
  investigationSteps: InvestigationStep[];
  similarIncidents:  SimilarIncident[];
  summary:           string;
}

export interface ScoreBreakdown {
  severityScore:         number;
  affectedServicesScore: number;
  similarityScore:       number;
  timeOfDayScore:        number;
  total:                 number;
}

export interface InvestigationStep {
  step:          number;
  action:        string;
  rationale:     string;
  logsToCheck:   string[];
  errorPattern:  string;
  failureDomain: string;
}

export interface SimilarIncident {
  id:             string;
  title:          string;
  similarityScore: number;
  severity:       Severity;
  rootCause:      string;
  resolution:     string;
  resolvedInMin:  number;
}

// ── Root Cause ───────────────────────────────────────────────────────────────

export interface Alert {
  alertName:    string;
  severity:     string;
  service:      string;
  firedAt:      string;
  description?: string;
  value?:       number | string;
  threshold?:   number | string;
}

export interface RootCauseRequest {
  title:            string;
  description:      string;
  severity:         Severity;
  affectedServices: string[];
  logs:             LogEntry[];   // required
  alerts?:          Alert[];      // optional — enables deeper metrics
}

export interface AlertCorrelation {
  alertName:           string;
  service:             string;
  nearestErrorDeltaMs:  number | null;
  nearestErrorDeltaSec: number | null;
  nearestErrorLog:      string | null;
  strongCorrelation:    boolean;
}

export interface AlertPatternMatch {
  patternId:     string;
  failureDomain: string;
  matchCount:    number;
}

export interface AlertAnalysis {
  alertCount:           number;
  bySeverity:           Record<string, number>;
  byService:            Record<string, number>;
  dominantAlert:        Alert;
  serviceOverlap:       string[];
  timeCorrelation:      AlertCorrelation[];
  alertPatternMatches:  AlertPatternMatch[];
  alertScore:           number;
  interpretation:       string;
}

export interface RootCauseResult {
  analysisId:             string;
  receivedAt:             string;
  primaryHypothesis:      Hypothesis | null;
  alternativeHypotheses:  Hypothesis[];
  confidenceScore:        ConfidenceScore;
  evidence:               Evidence[];
  alertAnalysis:          AlertAnalysis | null;
  traceAnalysis:          TraceAnalysis;
  similarIncidents:       SimilarIncident[];
  summary:                string;
}

export interface Hypothesis {
  patternId:     string;
  failureDomain: string;
  hypothesis:    string;
  remediation?:  string;
  nextSteps?:    string[];
}

export interface ConfidenceScore {
  logCorrelation:      number;
  serviceCorrelation:  number;
  historicalSimilarity: number;
  convergenceBonus:    number;
  alertBonus:          number;
  total:               number;
  band:                ConfidenceBand;
  alertsUsed:          boolean;
}

export interface Evidence {
  source:      string;
  description: string;
  strength:    'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TraceAnalysis {
  tracesFound: number;
  diagrams:    TraceDiagram[];
}

export interface TraceDiagram {
  traceId:       string;
  hasFailure:    boolean;
  failureOrigin: string | null;
  diagram:       string;
  services:      string[];
  eventCount:    number;
}

// ── API Envelope ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data:  T | null;
  error: string | null;
  meta:  { timestamp: string; version: string };
}
