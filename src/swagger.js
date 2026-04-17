import swaggerJsdoc    from 'swagger-jsdoc';
import swaggerUiExpress from 'swagger-ui-express';

const definition = {
  openapi: '3.0.3',
  info: {
    title:       'TriageX API',
    version:     '1.0.0',
    description: 'AI-Powered Incident Analysis & Triage System for a trading platform.\n\n' +
                 'Three capabilities:\n' +
                 '- **Log Ingestion & Analysis** — semantic clustering, anomaly detection, RAG\n' +
                 '- **Incident Triage** — composite priority scoring (P1–P4), investigation steps\n' +
                 '- **Root Cause Suggestion** — multi-signal confidence scoring, trace diagrams',
  },
  servers: [{ url: '/api/v1', description: 'Local development' }],
  tags: [
    { name: 'Logs',      description: 'Log ingestion and analysis' },
    { name: 'Incidents', description: 'Incident triage and root-cause analysis' },
  ],
  components: {
    schemas: {

      // ── Shared ────────────────────────────────────────────────────────────
      LogEntry: {
        type: 'object',
        required: ['level', 'message', 'service', 'timestamp'],
        properties: {
          level:     { type: 'string', enum: ['ERROR', 'WARN', 'INFO', 'DEBUG'], example: 'ERROR' },
          message:   { type: 'string', example: 'Feed provider connection lost after 3 retries' },
          service:   { type: 'string', example: 'market-data-feed' },
          timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T09:01:05.000Z' },
          traceId:   { type: 'string', nullable: true, example: 'trc-8821' },
          instance:  { type: 'string', nullable: true, example: 'feed-01' },
        },
      },

      Alert: {
        type: 'object',
        required: ['alertName', 'severity', 'service', 'firedAt'],
        properties: {
          alertName:   { type: 'string', example: 'StalePriceThresholdBreached' },
          severity:    { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], example: 'CRITICAL' },
          service:     { type: 'string', example: 'price-engine' },
          firedAt:     { type: 'string', format: 'date-time', example: '2024-01-15T09:01:14.000Z' },
          description: { type: 'string', example: 'Stale price detected across instruments' },
          value:       { type: 'string', nullable: true, example: '17s' },
          threshold:   { type: 'string', nullable: true, example: '10s' },
        },
      },

      SimilarIncident: {
        type: 'object',
        properties: {
          id:             { type: 'string', example: 'INC-001' },
          title:          { type: 'string' },
          similarityScore:{ type: 'number', format: 'float', example: 0.97 },
          severity:       { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          rootCause:      { type: 'string' },
          resolution:     { type: 'string' },
          resolvedInMin:  { type: 'integer', example: 18 },
        },
      },

      ApiError: {
        type: 'object',
        properties: {
          data:  { nullable: true, example: null },
          error: { type: 'string', example: 'Field "logs" is required.' },
          meta:  { type: 'object', nullable: true, example: null },
        },
      },

      // ── Log Analysis ───────────────────────────────────────────────────────
      LogAnalysisRequest: {
        type: 'object',
        required: ['logs'],
        properties: {
          logs: {
            type: 'array',
            minItems: 1,
            maxItems: 500,
            items: { $ref: '#/components/schemas/LogEntry' },
          },
        },
      },

      LogAnalysisResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              totalLogs:   { type: 'integer', example: 6 },
              analyzedAt:  { type: 'string', format: 'date-time' },
              byService: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    logCount:   { type: 'integer' },
                    errorCount: { type: 'integer' },
                    errorRate:  { type: 'number' },
                    clusters:   { type: 'array', items: {} },
                  },
                },
              },
              byTimePeriod: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    windowStart:   { type: 'string', format: 'date-time' },
                    windowEnd:     { type: 'string', format: 'date-time' },
                    logCount:      { type: 'integer' },
                    errorCount:    { type: 'integer' },
                    errorRate:     { type: 'number' },
                    spikeDetected: { type: 'boolean' },
                    services:      { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              anomalies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type:        { type: 'string' },
                    severity:    { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
              summary: { type: 'string' },
            },
          },
          error: { type: 'string', nullable: true },
          meta:  { type: 'object' },
        },
      },

      // ── Triage ─────────────────────────────────────────────────────────────
      TriageRequest: {
        type: 'object',
        required: ['title', 'description', 'severity', 'affectedServices'],
        properties: {
          title:            { type: 'string', example: 'Stale prices on all instruments' },
          description:      { type: 'string', example: 'Price engine rejecting updates due to staleness threshold exceeded.' },
          severity:         { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], example: 'CRITICAL' },
          affectedServices: { type: 'array', items: { type: 'string' }, example: ['market-data-feed', 'price-engine', 'order-gateway'] },
        },
      },

      TriageResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              incidentId:    { type: 'string', example: 'triage-1234567890' },
              receivedAt:    { type: 'string', format: 'date-time' },
              priorityScore: { type: 'integer', example: 85 },
              priorityBand:  { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'], example: 'P1' },
              scoreBreakdown: {
                type: 'object',
                properties: {
                  severityScore:         { type: 'integer', example: 30 },
                  affectedServicesScore: { type: 'integer', example: 21 },
                  similarityScore:       { type: 'integer', example: 29 },
                  timeOfDayScore:        { type: 'integer', example: 5 },
                  total:                 { type: 'integer', example: 85 },
                },
              },
              investigationSteps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    step:          { type: 'integer' },
                    action:        { type: 'string' },
                    rationale:     { type: 'string' },
                    logsToCheck:   { type: 'array', items: { type: 'string' } },
                    errorPattern:  { type: 'string' },
                    failureDomain: { type: 'string' },
                  },
                },
              },
              similarIncidents: { type: 'array', items: { $ref: '#/components/schemas/SimilarIncident' } },
              summary: { type: 'string' },
            },
          },
          error: { type: 'string', nullable: true },
          meta:  { type: 'object' },
        },
      },

      // ── Root Cause ──────────────────────────────────────────────────────────
      RootCauseRequest: {
        type: 'object',
        required: ['title', 'description', 'severity', 'affectedServices', 'logs'],
        properties: {
          title:            { type: 'string', example: 'Feed provider stale price cascade' },
          description:      { type: 'string', example: 'Stale price threshold exceeded causing order rejections across all instruments.' },
          severity:         { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], example: 'CRITICAL' },
          affectedServices: { type: 'array', items: { type: 'string' }, example: ['market-data-feed', 'price-engine'] },
          logs: {
            type: 'array',
            minItems: 1,
            description: 'Required. Log evidence from the affected services.',
            items: { $ref: '#/components/schemas/LogEntry' },
          },
          alerts: {
            type: 'array',
            nullable: true,
            description: 'Optional. When provided, enables deeper alert correlation metrics and boosts confidence score.',
            items: { $ref: '#/components/schemas/Alert' },
          },
        },
      },

      RootCauseResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              analysisId:  { type: 'string', example: 'rc-1234567890' },
              receivedAt:  { type: 'string', format: 'date-time' },
              primaryHypothesis: {
                nullable: true,
                type: 'object',
                properties: {
                  patternId:     { type: 'string' },
                  failureDomain: { type: 'string' },
                  hypothesis:    { type: 'string' },
                  remediation:   { type: 'string' },
                  nextSteps:     { type: 'array', items: { type: 'string' } },
                },
              },
              alternativeHypotheses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    patternId:     { type: 'string' },
                    failureDomain: { type: 'string' },
                    hypothesis:    { type: 'string' },
                  },
                },
              },
              confidenceScore: {
                type: 'object',
                properties: {
                  logCorrelation:      { type: 'integer', example: 30 },
                  serviceCorrelation:  { type: 'integer', example: 15 },
                  historicalSimilarity:{ type: 'integer', example: 29 },
                  convergenceBonus:    { type: 'integer', example: 0 },
                  alertBonus:          { type: 'integer', example: 20, description: 'Non-zero only when alerts provided' },
                  total:               { type: 'integer', example: 94 },
                  band:                { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'] },
                  alertsUsed:          { type: 'boolean' },
                },
              },
              evidence: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source:      { type: 'string' },
                    description: { type: 'string' },
                    strength:    { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                  },
                },
              },
              alertAnalysis: {
                nullable: true,
                type: 'object',
                description: 'Only present when alerts were provided in the request.',
                properties: {
                  alertCount:       { type: 'integer' },
                  bySeverity:       { type: 'object', additionalProperties: { type: 'integer' } },
                  byService:        { type: 'object', additionalProperties: { type: 'integer' } },
                  serviceOverlap:   { type: 'array', items: { type: 'string' }, description: 'Services with both alert AND error log — highest confidence signal' },
                  alertScore:       { type: 'integer', example: 20 },
                  interpretation:   { type: 'string' },
                  timeCorrelation: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        alertName:            { type: 'string' },
                        service:              { type: 'string' },
                        nearestErrorDeltaSec: { type: 'integer', nullable: true },
                        strongCorrelation:    { type: 'boolean' },
                        nearestErrorLog:      { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
              traceAnalysis: {
                type: 'object',
                properties: {
                  tracesFound: { type: 'integer' },
                  diagrams: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        traceId:       { type: 'string' },
                        hasFailure:    { type: 'boolean' },
                        failureOrigin: { type: 'string', nullable: true },
                        diagram:       { type: 'string', description: 'ASCII call-chain diagram' },
                        services:      { type: 'array', items: { type: 'string' } },
                        eventCount:    { type: 'integer' },
                      },
                    },
                  },
                },
              },
              similarIncidents: { type: 'array', items: { $ref: '#/components/schemas/SimilarIncident' } },
              summary: { type: 'string' },
            },
          },
          error: { type: 'string', nullable: true },
          meta:  { type: 'object' },
        },
      },
    },
  },

  paths: {
    '/logs/analyze': {
      post: {
        tags: ['Logs'],
        summary: 'Analyse a batch of log entries',
        description:
          'Accepts up to 500 log entries. Returns semantic clusters, per-service breakdown, ' +
          '1-minute tumbling window spike detection, anomaly analysis, and an AI-generated summary ' +
          'augmented by similar historical incidents from the KnowledgeStore.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LogAnalysisRequest' } } },
        },
        responses: {
          200: { description: 'Analysis complete', content: { 'application/json': { schema: { $ref: '#/components/schemas/LogAnalysisResponse' } } } },
          422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },

    '/incidents/triage': {
      post: {
        tags: ['Incidents'],
        summary: 'Triage and prioritise an incident',
        description:
          'Computes a composite priority score (0–100) across four signals: severity weight, ' +
          'affected service count, vector similarity to historical incidents, and time-of-day (market hours). ' +
          'Returns a P1–P4 band, score breakdown, ordered investigation steps, and similar past incidents.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TriageRequest' } } },
        },
        responses: {
          200: { description: 'Triage result', content: { 'application/json': { schema: { $ref: '#/components/schemas/TriageResponse' } } } },
          422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },

    '/incidents/root-cause': {
      post: {
        tags: ['Incidents'],
        summary: 'Suggest root cause for an incident',
        description:
          'Runs three independent signals (pattern matching, log correlation, historical similarity) ' +
          'and optionally a fourth alert signal when `alerts` are provided. ' +
          'Returns a primary hypothesis, confidence score, evidence list, distributed trace diagrams, ' +
          'and next steps for the on-call engineer.\n\n' +
          '**`logs` is required.** Root-cause analysis needs observed log evidence.\n\n' +
          '**`alerts` is optional.** When provided, enables deep alert correlation: ' +
          'service overlap detection, time correlation to error logs, and up to +20 confidence pts.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RootCauseRequest' } } },
        },
        responses: {
          200: { description: 'Root cause analysis', content: { 'application/json': { schema: { $ref: '#/components/schemas/RootCauseResponse' } } } },
          422: { description: 'Validation error — logs missing or invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
  },
};

const spec = swaggerJsdoc({ definition, apis: [] });

/**
 * mountSwagger — registers the Swagger UI and JSON spec routes on the app.
 * UI available at /api-docs
 * Raw spec at /api-docs.json
 */
export function mountSwagger(app) {
  app.get('/api-docs.json', (_req, res) => res.json(spec));
  app.use('/api-docs', swaggerUiExpress.serve, swaggerUiExpress.setup(spec, {
    customSiteTitle: 'TriageX API Docs',
    swaggerOptions:  { defaultModelsExpandDepth: 1, docExpansion: 'list' },
  }));
}
