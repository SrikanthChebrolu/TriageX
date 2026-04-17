# TriageX
AI-Powered Incident Analysis & Triage System

## Prerequisites

- Node.js 18+
- npm

---

## Local Development

### Run both servers at once

```bash
npm install
cd frontend && npm install && cd ..
npm run dev:all
```

- **API** → `http://localhost:3001`
- **UI** → `http://localhost:5173` (Vite HMR)

### Run separately (two terminals)

**Terminal 1 — Backend**
```bash
npm install
npm run dev
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

The frontend reads `VITE_API_URL` to locate the backend. Defaults to `http://localhost:3001` when not set.

To override, create `frontend/.env.local`:

```
VITE_API_URL=http://localhost:3001
```

---

## Build

```bash
npm run build
```

Runs `tsc` + Vite and outputs the production bundle to `frontend/dist/`.

Preview the production build locally:

```bash
cd frontend && npm run preview
```

---

## Deploy to Netlify

The repo includes a `netlify.toml` — Netlify picks it up automatically.

### One-click via Netlify UI

1. Push the repo to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
3. Connect your GitHub repo
4. Netlify auto-detects `netlify.toml` — no manual settings needed
5. Click **Deploy site**

Netlify will:
- Build the React frontend (`frontend/dist`)
- Deploy the Express backend as a Netlify Function
- Route all `/api/*` requests to the function automatically

### Via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init        # link to a Netlify site
netlify deploy --prod
```

### How it works on Netlify

| Layer | How deployed |
|---|---|
| React UI | Static site from `frontend/dist` |
| Express API | Netlify Function (`netlify/functions/api.mjs`) |
| `/api/*` routing | Redirect rule in `netlify.toml` → function |
| SPA routing | Fallback redirect `/* → /index.html` |

`VITE_API_URL` is automatically set to `/api/v1` in the Netlify build so the frontend calls the function on the same domain — no CORS issues.

---

## Tests

```bash
npm test
```

Runs the Jest test suite against the backend services.

---

## All Scripts

| Location | Command | Description |
|---|---|---|
| root | `npm start` | Start API server (production) |
| root | `npm run dev` | Start API server with file-watch |
| root | `npm run dev:all` | Start API + UI together |
| root | `npm run build` | Build frontend for production |
| root | `npm test` | Run backend test suite |
| frontend | `npm run dev` | Start Vite dev server |
| frontend | `npm run build` | Type-check + production bundle |
| frontend | `npm run preview` | Serve production build locally |
| frontend | `npm run lint` | Run ESLint |
