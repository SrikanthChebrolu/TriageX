# TriageX — Development Guidelines

## Project Overview

AI-Powered Incident Analysis & Triage System for a trading platform. REST API backend (Node.js) + React frontend.

Run: `npm install && npm start`

---

## React Frontend — Functional Component Best Practices

### Component Structure

- Use functional components exclusively — no class components.
- One component per file. File name matches the exported component name (PascalCase).
- Keep components small and focused: if a component exceeds ~150 lines, split it.
- Co-locate component-specific styles, tests, and types in the same directory.

```
src/
  components/
    IncidentCard/
      IncidentCard.tsx
      IncidentCard.test.tsx
      IncidentCard.module.css
  hooks/
  pages/
  services/
```

### Hooks

- Use `useState` for local UI state only. Lift state up when two+ siblings need it.
- Use `useEffect` with explicit dependency arrays — never omit deps or use empty `[]` unless the effect truly runs once on mount.
- Extract reusable logic into custom hooks (`useIncidents`, `useTriage`, etc.) — hooks are the unit of reuse, not HOCs or render props.
- Custom hooks live in `src/hooks/`. Name them `use<Domain>`.
- Avoid putting async logic directly in `useEffect` — define an `async` function inside and call it:

```ts
useEffect(() => {
  async function fetchData() { ... }
  fetchData();
}, [id]);
```

### Props & Types

- Define prop types with TypeScript interfaces, not `React.FC<Props>` generic (prefer explicit return type `JSX.Element`).
- Destructure props at the function signature.
- Avoid prop drilling beyond 2 levels — use Context or a state manager instead.

### State Management

- Prefer local state + prop passing for simple trees.
- Use React Context for cross-cutting concerns (auth, theme, notifications).
- For server state (incidents, logs, triage results), use **TanStack Query** (`@tanstack/react-query`) — never use manual `useState` + `useEffect` combos for fetching.

### TanStack Query (server state — mandatory)

- All backend data fetching must use TanStack Query. No raw `fetch`/`axios` inside components or `useEffect`.
- Wrap the app in `<QueryClientProvider>` at the root.
- Define query keys as constants in `src/queryKeys.ts` — never inline strings.
- Use `useQuery` for reads, `useMutation` for writes. Invalidate affected queries in `onSuccess`:

```ts
const mutation = useMutation({
  mutationFn: (incident) => api.triageIncident(incident),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incidents }),
});
```

- Set sensible global defaults in `QueryClient`: `staleTime: 30_000`, `retry: 1`.
- Use `enabled` to defer queries that depend on other data: `useQuery({ ..., enabled: !!incidentId })`.
- Handle `isLoading`, `isError`, and `data` states in every query consumer — never assume data is present.

### TanStack Table (tables — mandatory)

- Every table in the UI must use `@tanstack/react-table`. No hand-rolled `<table>` markup or other table libraries.
- Define columns with `createColumnHelper` typed to your row model.
- Keep column definitions outside the component (module-level constant) to avoid recreation on re-render.
- Use `useReactTable` with `getCoreRowModel()` as the baseline; add feature models only when needed:
  - Sorting → `getSortedRowModel()`
  - Filtering → `getFilteredRowModel()`
  - Pagination → `getPaginationRowModel()`
- Render via `table.getHeaderGroups()` / `table.getRowModel().rows` — never access raw data array for rendering.
- Separate table state (sorting, pagination, filters) using `useState` wired to `onSortingChange` etc., not managed inside the table instance.

```ts
const columnHelper = createColumnHelper<Incident>();
const columns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('title', { header: 'Title' }),
  columnHelper.accessor('severity', { header: 'Severity' }),
];

function IncidentTable({ data }: { data: Incident[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  // render table.getHeaderGroups() and table.getRowModel().rows
}
```

### Performance

- Wrap expensive computations in `useMemo`. Wrap stable callbacks passed to child components in `useCallback`.
- Use `React.memo` on leaf components that receive stable props and re-render often.
- Lazy-load routes with `React.lazy` + `Suspense`.
- Avoid anonymous functions and object literals in JSX props — they create new references on every render.

### Error Handling

- Wrap page-level trees in an `ErrorBoundary` component.
- Show user-facing error states inline; log details to console in development only.

### Visual Design — Tradeweb-Inspired Theme (mandatory)

The UI must use Tradeweb's colour palette and visual language (https://www.tradeweb.com/).
Tradeweb is a professional fixed-income and derivatives trading platform — the aesthetic is
**clean, high-density, authoritative**: deep navy backgrounds, crisp white text, teal/cyan
accents for interactive elements and live data, tight typography.

#### CSS Custom Properties (`src/index.css`)

```css
:root {
  /* Backgrounds — white/light hierarchy */
  --bg-base:      #ffffff;   /* page background */
  --bg-surface:   #ffffff;   /* card / panel surface */
  --bg-overlay:   #f4f6f9;   /* table row hover, input background, section tint */
  --bg-header:    #003366;   /* sidebar — Tradeweb deep navy */

  /* Borders */
  --border:        #d0d7e2;   /* default border */
  --border-subtle: #e8ecf2;   /* dividers, row separators */

  /* Text */
  --text-primary:   #0d1a2e;   /* main body text — near-black navy */
  --text-secondary: #4a5a7a;   /* labels, secondary info */
  --text-muted:     #8a96aa;   /* placeholders, disabled */

  /* Tradeweb accent — teal/cyan */
  --accent:       #0099b8;   /* primary interactive: links, active nav, focus rings */
  --accent-hover: #007a94;
  --accent-dim:   #e6f6fa;   /* subtle accent backgrounds */

  /* Tradeweb brand blue (buttons, CTAs) */
  --brand:        #003da5;   /* primary buttons */
  --brand-hover:  #0050cc;

  /* Semantic */
  --success:  #00875a;
  --warning:  #b86e00;
  --error:    #cc1f1f;

  /* Severity */
  --severity-low:      #00875a;
  --severity-medium:   #b86e00;
  --severity-high:     #c45000;
  --severity-critical: #cc1f1f;

  /* Priority */
  --priority-p1: #cc1f1f;
  --priority-p2: #c45000;
  --priority-p3: #b86e00;
  --priority-p4: #00875a;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace;

  /* Radii */
  --radius-sm: 3px;
  --radius:    4px;
  --radius-lg: 6px;
}
```

#### Design Principles

1. **White-first surfaces** — page background and all cards are white (`#ffffff`). Use
   `--bg-overlay` (#f4f6f9) only for table headers, input fields, and subtle section tints.
   No dark backgrounds anywhere in the content area.

2. **Navy sidebar** — the left navigation sidebar uses Tradeweb's deep navy (`#003366`)
   with white text and a teal left-border on the active link. This is the only dark surface.

3. **Teal accent for interactivity** — `--accent` (#0099b8) is the single interactive colour:
   active nav links, focus outlines, hyperlinks, sort indicators, hover states on rows.
   `--brand` (#003da5) is reserved for primary action buttons (Submit, Triage, Analyse).

4. **High-density layout** — financial data tools are information-dense. Use `13–14px` body
   text, `11–12px` for labels and table headers, tight padding (`8px 12px` for table cells).

5. **Table headers** — `ALL CAPS`, `11px`, `letter-spacing: 0.6px`, `color: var(--text-secondary)`,
   `background: var(--bg-overlay)`. Match the feel of a Tradeweb blotter.

6. **Cards / panels** — `background: #ffffff`, `border: 1px solid var(--border)`,
   `border-radius: var(--radius-lg)`. Subtle `box-shadow: 0 1px 4px rgba(0,0,0,0.07)`.

7. **Priority / severity badges** — small badges using `--severity-*` colours with a light
   tint background and a matching border. Font: `10px`, `700 weight`, `UPPERCASE`.

8. **No dark mode** — the UI is always light/white. Do not add `prefers-color-scheme: dark`
   overrides or any dark-mode classes.

9. **Focus rings** — `outline: 2px solid var(--accent)`, `outline-offset: 2px`.

10. **Monospace for financial data** — use `--font-mono` for all numbers, IDs, timestamps,
    service names, metrics, and log messages.

### API Calls

- All API calls go through a `src/services/api.ts` module — never call `fetch`/`axios` directly from a component.
- Use environment variables (`VITE_API_URL`) for base URLs — never hardcode.

### Testing

- Test behavior, not implementation: use React Testing Library, query by role/label/text.
- One test file per component. Cover: renders correctly, user interactions, loading/error states.
- Mock API calls at the service layer, not inside components.

---

## Node.js Backend — Best Practices

### Project Structure

```
src/
  routes/         # Express route definitions (thin — delegate to controllers)
  controllers/    # Request parsing, response formatting
  services/       # Business logic (triage, analysis, root-cause)
  models/         # Data shapes / TypeScript interfaces
  middleware/     # Auth, error handling, request validation
  data/           # Seed data, in-memory stores
  utils/          # Pure helper functions
main.js           # Entry point — wires app and starts server
```

### Express Conventions

- Define routes in dedicated router files; mount them in `main.js`.
- Controllers handle HTTP concerns only (parse req, call service, send res). No business logic in controllers.
- Services contain all domain logic — they are pure Node.js, no Express imports.
- Use `express-validator` or `zod` for input validation at the route layer before reaching the controller.

### Error Handling

- Use a single centralized error-handling middleware registered last:

```js
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message });
});
```

- Use a custom `AppError` class with a `status` field. Throw it from services; let middleware catch it.
- Always `next(err)` in async route handlers — or wrap with an `asyncHandler` utility:

```js
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

### Async / Promises

- Use `async/await` throughout — avoid `.then()` chains.
- Never swallow errors in `catch` blocks — either rethrow or pass to `next`.

### Configuration

- All config (port, feature flags) in `src/config.js` loaded from `process.env`.
- Use `dotenv` for local development. Never commit `.env` files.
- Validate required env vars at startup and fail fast if missing.

### In-Memory Data (per assignment constraints)

- Store seed data in plain JS modules (`src/data/incidents.js`, `src/data/logs.js`).
- Export factory functions that return fresh copies — prevents accidental mutation of seed state.
- Keep in-memory stores as module-level `Map` or `Array` instances; access only through service functions.

### API Design

- Use RESTful resource naming: `POST /api/logs/analyze`, `POST /api/incidents/triage`, `POST /api/incidents/root-cause`.
- Return consistent response envelopes: `{ data, error, meta }`.
- Use HTTP status codes correctly: `200` success, `400` bad input, `404` not found, `422` validation error, `500` server error.
- Version the API from the start: `/api/v1/...`.

### LLM Extensibility (key evaluation criterion)

- Abstract AI calls behind an `LLMProvider` interface with a single `analyze(prompt, context)` method.
- Ship a `MockLLMProvider` (pattern matching / keyword extraction) as the default.
- Real LLM providers (OpenAI, Anthropic) drop in by implementing the same interface — no changes to calling services.

```js
// services/llm/interface.js
class LLMProvider {
  async analyze(prompt, context) { throw new Error('Not implemented'); }
}
```

### Testing

- Unit-test services in isolation — inject dependencies, mock the LLM provider.
- Integration-test routes with `supertest` — spin up the Express app, hit real endpoints.
- Tests live alongside source in `__tests__/` subdirectories or as `*.test.js` files.
- Use `jest` as the test runner. Aim for coverage on all three capability modules (log analysis, triage, root-cause).

### Code Quality

- Use ESLint (`eslint:recommended` + `plugin:node/recommended`) and Prettier.
- Enforce `no-unused-vars`, `no-console` (warn in dev, error in CI).
- Prefer named exports over default exports for services and utilities.
- No magic numbers or strings — define constants in `src/constants.js`.
