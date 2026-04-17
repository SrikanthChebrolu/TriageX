# Responsive Design & SASS Guidelines

Apply responsive design and SASS best practices to the TriageX frontend.

## What to do

Review the file(s) specified (or the current component if none given) and enforce the following rules. Make changes where needed.

---

## SASS / CSS Architecture

### File Structure
```
src/
  styles/
    _variables.scss      # CSS custom property mirrors + SASS vars
    _mixins.scss         # Responsive breakpoint mixins, utility mixins
    _reset.scss          # Normalize/reset
    _typography.scss     # Font scale, heading sizes
    index.scss           # Main entry — imports all partials
  components/
    ComponentName/
      ComponentName.module.scss   # Component-scoped styles
```

### Variables
- Mirror all CSS custom properties from `src/index.css` as SASS variables in `_variables.scss`:
  ```scss
  $bg-base:      #ffffff;
  $bg-header:    #003366;
  $accent:       #0099b8;
  $brand:        #003da5;
  $text-primary: #0d1a2e;
  // ... etc
  ```
- Never hardcode color hex values in component files — always use the variable or CSS custom property.

### Mixins
- Define breakpoint mixins in `_mixins.scss`:
  ```scss
  $breakpoints: (
    'xs':  480px,
    'sm':  640px,
    'md':  768px,
    'lg':  1024px,
    'xl':  1280px,
    '2xl': 1536px,
  );

  @mixin respond-to($bp) {
    @media (min-width: map-get($breakpoints, $bp)) {
      @content;
    }
  }

  @mixin respond-below($bp) {
    @media (max-width: calc(map-get($breakpoints, $bp) - 1px)) {
      @content;
    }
  }
  ```
- Use mixins consistently — never write raw `@media` queries in component files.
- Common utility mixins to define: `flex-center`, `truncate`, `visually-hidden`, `sr-only`.

### SASS Rules
- Use `@use` and `@forward` — never `@import` (deprecated).
- Nest selectors max 3 levels deep.
- Use BEM naming for component classes: `.incident-card__header--active`.
- Keep component `.module.scss` files under 100 lines; extract shared patterns to `_mixins.scss`.
- Prefix component-internal variables with `$_` (e.g., `$_row-height: 36px`).

---

## Responsive Design

### Breakpoints (Tradeweb-aligned)
| Name | Min Width | Target devices |
|------|-----------|----------------|
| xs   | 480px     | Large phones   |
| sm   | 640px     | Small tablets  |
| md   | 768px     | Tablets        |
| lg   | 1024px    | Small laptops  |
| xl   | 1280px    | Desktops       |
| 2xl  | 1536px    | Wide monitors  |

TriageX is a trading platform — **desktop-first**. Design for `xl`/`2xl` as the primary viewport; adapt down to `md`. Below `md` is a graceful degradation, not a primary target.

### Layout Rules
- Use CSS Grid for page-level layout (sidebar + main content area).
- Use Flexbox for component-level layout (rows, cards, toolbars).
- Sidebar collapses to icon-only at `lg` and below; hidden at `sm` and below (burger menu trigger).
- Tables scroll horizontally on narrow viewports — never break table layout.
- Never use `px` for font sizes — use `rem`. Base: `1rem = 16px`.
- Use `clamp()` for fluid typography: `clamp(0.75rem, 1.5vw, 0.875rem)`.

### Grid Structure
```scss
.app-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: auto 1fr;
  min-height: 100vh;

  @include respond-below('lg') {
    grid-template-columns: 60px 1fr; // icon-only sidebar
  }

  @include respond-below('sm') {
    grid-template-columns: 1fr; // sidebar hidden
  }
}
```

### Component Responsive Rules
- Cards: single column on `sm`, 2-col on `md`, 3-col on `xl`.
- Forms: stacked on `sm`, side-by-side label+input on `md`+.
- Toolbars: wrap actions into a `...` overflow menu on `sm`.
- Data tables: pin first column (ID/name), allow horizontal scroll for remaining columns on `md`-.

### Touch Targets
- Minimum tap target: `44px × 44px` for interactive elements on tablet viewports.
- Increase button padding at `md` and below: `padding: 10px 16px`.

---

## Tradeweb Color Theme (Mandatory)

The UI must follow Tradeweb's visual language: clean, high-density, authoritative.
**Always use CSS custom properties — never raw hex values in component files.**

### Full Color Palette

```scss
// _variables.scss — mirror every token from src/index.css

// Backgrounds
$bg-base:      #ffffff;   // page background
$bg-surface:   #ffffff;   // card / panel surface
$bg-overlay:   #f4f6f9;   // table row hover, input bg, section tint
$bg-header:    #003366;   // sidebar — Tradeweb deep navy (ONLY dark surface)

// Borders
$border:        #d0d7e2;  // default border
$border-subtle: #e8ecf2;  // dividers, row separators

// Text
$text-primary:   #0d1a2e; // main body — near-black navy
$text-secondary: #4a5a7a; // labels, secondary info
$text-muted:     #8a96aa; // placeholders, disabled

// Tradeweb accent — teal/cyan (interactive elements)
$accent:       #0099b8;   // links, active nav, focus rings, sort indicators
$accent-hover: #007a94;
$accent-dim:   #e6f6fa;   // subtle accent backgrounds

// Tradeweb brand blue (buttons, CTAs only)
$brand:        #003da5;   // primary buttons
$brand-hover:  #0050cc;

// Semantic
$success:  #00875a;
$warning:  #b86e00;
$error:    #cc1f1f;

// Severity badges
$severity-low:      #00875a;
$severity-medium:   #b86e00;
$severity-high:     #c45000;
$severity-critical: #cc1f1f;

// Priority badges
$priority-p1: #cc1f1f;
$priority-p2: #c45000;
$priority-p3: #b86e00;
$priority-p4: #00875a;

// Typography
$font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace;

// Border radii
$radius-sm: 3px;
$radius:    4px;
$radius-lg: 6px;
```

### Design Principles to Enforce

1. **White-first surfaces** — `background: var(--bg-base)` on page; `var(--bg-surface)` on cards.
   Use `var(--bg-overlay)` only for table headers, input fields, section tints. No dark content backgrounds.

2. **Navy sidebar only** — `var(--bg-header)` (`#003366`) is the sole dark surface.
   Active nav link: white text + `border-left: 3px solid var(--accent)`.

3. **Teal for interactivity** — `var(--accent)` on: active nav, focus outlines, links, sort arrows, row hover borders.
   `var(--brand)` only for primary action buttons (Submit, Triage, Analyse).

4. **High-density layout** — `13–14px` body text, `11–12px` for labels and table headers.
   Table cell padding: `8px 12px`. Do NOT inflate these on desktop viewports.

5. **Table headers** — `ALL CAPS`, `11px`, `letter-spacing: 0.6px`, `color: var(--text-secondary)`,
   `background: var(--bg-overlay)`.

6. **Cards / panels**:
   ```scss
   background: var(--bg-surface);
   border: 1px solid var(--border);
   border-radius: var(--radius-lg);
   box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
   ```

7. **Severity / priority badges** — small (`10px`, `700 weight`, `UPPERCASE`) with light tint background:
   ```scss
   .badge--critical {
     color: var(--severity-critical);
     background: rgba(204, 31, 31, 0.08);
     border: 1px solid rgba(204, 31, 31, 0.25);
   }
   ```

8. **No dark mode** — never add `prefers-color-scheme: dark` overrides or dark-mode classes.

9. **Focus rings** — `outline: 2px solid var(--accent); outline-offset: 2px` on all interactive elements.

10. **Monospace for financial data** — `font-family: var(--font-mono)` on all numbers, IDs, timestamps,
    service names, metrics, and log messages.

### Theme Compliance When Adding Responsive Styles
- Never override sidebar navy at any breakpoint.
- Keep white content area at all viewports.
- Teal accent must remain visible on mobile nav (icon + active indicator).
- Badges retain their severity colors at all sizes — do not simplify to grey on mobile.

---

## Checklist Before Done
- [ ] No hardcoded hex values in component SCSS files
- [ ] All media queries use `respond-to` / `respond-below` mixins
- [ ] No `@import` — only `@use` / `@forward`
- [ ] Nesting ≤ 3 levels deep
- [ ] Tables scroll horizontally (not break) on narrow viewports
- [ ] Touch targets ≥ 44px at `md` and below
- [ ] Navy sidebar, white content area preserved at all breakpoints
