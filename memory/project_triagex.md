---
name: TriageX Project State
description: Implementation status and architecture decisions for TriageX AI incident triage system
type: project
---

TriageX is a complete AI-powered incident analysis system for a trading platform.

**Why:** Coding assignment demonstrating distributed systems observability, RAG, and mock LLM patterns.

**How to apply:** This project is fully implemented. Future sessions should treat all files as correct/complete baseline unless the user asks for changes.

## Implementation Complete (as of 2026-04-17)

### Backend (Node.js ESM, Express, port 3001)
- `npm start` — starts backend
- `npm run dev` — starts with --watch (hot reload)
- All 3 endpoints working:
  - `POST /api/v1/logs/analyze` — accepts `{ logs: [...] }`
  - `POST /api/v1/incidents/triage` — accepts `{ title, description, severity, affectedServices }`
  - `POST /api/v1/incidents/root-cause` — accepts same + optional `logs` array

### Frontend (React + TypeScript + Vite, port 5173)
- `npm run ui` — starts frontend dev server
- 3 pages: Log Analysis, Triage, Root Cause
- TanStack Query for data fetching, TanStack Table-ready
- Tradeweb color theme (navy sidebar, white content, teal accent)
- CSS Modules throughout

### Key architecture decisions
- `SimpleEmbeddings`: deterministic char-code 50-dim embedder (no API key needed)
- Two vector stores: per-request LogVectorStore (clustering) + singleton KnowledgeStore (RAG)
- Union-Find with cosine similarity for log clustering (threshold in constants.js)
- 4-signal confidence score for root cause: logCorrelation + alertCorrelation + historicalSimilarity + convergenceBonus
- MockLLMProvider: template-based deterministic output; real LLM swaps in via LLMProvider interface
- Logs body: controller accepts both `{ logs: [...] }` envelope and raw array `[...]`
- ASCII trace diagrams rendered in diagramRenderer.js, shown in RootCausePage
