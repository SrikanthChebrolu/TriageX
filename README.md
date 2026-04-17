# TriageX
AI-Powered Incident Analysis & Triage System

## Running the App

The project has two parts: a Node.js backend (port 3001) and a React frontend (port 5173).

### Run both at once

```bash
npm install
npm run dev:all
```

This starts both servers together using `concurrently`:
- **API** → `http://localhost:3001`
- **UI** → `http://localhost:5173`

---

### Run them separately (two terminals)

### Prerequisites

- Node.js 18+
- npm

### 1. Backend

```bash
# From the repo root
npm install
npm start
```

The API server starts at `http://localhost:3001`.

Use `npm run dev` instead of `npm start` to enable file-watch auto-restart during development.

### 2. Frontend

```bash
# In a second terminal
cd frontend
npm install
npm run dev
```

The UI opens at `http://localhost:5173`.

### Environment Variables

The frontend reads `VITE_API_URL` to locate the backend. It defaults to `http://localhost:3001` when the variable is not set.

To override, create `frontend/.env.local`:

```
VITE_API_URL=http://localhost:3001
```
