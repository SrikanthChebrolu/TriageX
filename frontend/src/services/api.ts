import type {
  ApiResponse,
  LogEntry,
  LogAnalysisResult,
  TriageRequest,
  TriageResult,
  RootCauseRequest,
  RootCauseResult,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const envelope: ApiResponse<T> = await res.json();

  if (!res.ok || envelope.error) {
    throw new Error(envelope.error ?? `Request failed: ${res.status}`);
  }
  if (!envelope.data) {
    throw new Error('Empty response from server');
  }
  return envelope.data;
}

export const api = {
  analyzeLogs:    (logs: LogEntry[])             => post<LogAnalysisResult>('/logs/analyze', { logs }),
  triageIncident: (req: TriageRequest)           => post<TriageResult>('/incidents/triage', req),
  suggestRootCause: (req: RootCauseRequest)      => post<RootCauseResult>('/incidents/root-cause', req),
};
