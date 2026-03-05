# KPI Dashboard

![TypeScript](https://img.shields.io/badge/TypeScript-✔-3178c6?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-90%2B%20passing-22c55e?style=flat-square)
![Build](https://img.shields.io/badge/Build-passing-22c55e?style=flat-square)
![Lint](https://img.shields.io/badge/Lint-clean-22c55e?style=flat-square)
![Playwright](https://img.shields.io/badge/Playwright-51%20E2E%20tests-2563eb?style=flat-square)

A sustainability KPI dashboard for agricultural farms, built as a portfolio project to demonstrate production-grade frontend engineering practices.

Live demo: [kpi-dashboard-six-theta.vercel.app](https://kpi-dashboard-six-theta.vercel.app)

> **No setup required to view the demo.** The app falls back to sample data automatically if Supabase is not configured. To enable plan value persistence, connect your own Supabase project using the setup instructions below.

---

## Overview

Farmers enrolled in sustainability programs need to track their performance across multiple KPIs — pasture access, nitrogen surplus, ammonia emissions, and more. Each KPI has a 5-tier scoring system (Aspirant → Bronze → Silver → Gold → Platinum) with directional logic (higher-is-better vs lower-is-better).

This dashboard visualises those KPIs using a custom bullet chart, allows farmers to set target (plan) values, and persists changes to a real backend.

---

## Features

- **Custom bullet chart visualisation** — built without a chart library. A fixed 5-tier positioning system where each segment represents equal visual width regardless of the numeric range between thresholds.
- **Bidirectional KPI logic** — correctly handles both higher-is-better and lower-is-better KPIs, including needle and diamond marker positioning.
- **Real backend** — data is fetched from and persisted to Supabase. Plan value changes use optimistic updates with server rollback on failure.
- **Mock data fallback** — if Supabase is unavailable or not configured, the app falls back to sample data so it always works.
- **Interactive modal** — click any KPI row to open a detail modal showing current tier, target value editor, threshold ranges, and explanation.
- **Error boundary** — catches render errors and shows a recoverable fallback UI.

---

## Tech Stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Framework  | React 19 + TypeScript                        |
| Styling    | styled-components with CSS custom properties |
| Backend    | Supabase (PostgreSQL + REST API)             |
| Routing    | React Router v6                              |
| Unit tests | Vitest + Testing Library                     |
| E2E tests  | Playwright (Chromium, Firefox, WebKit)       |
| Build      | Vite                                         |

---

## Architecture

```
src/
├── components/
│   ├── KPISection/
│   │   ├── KPISection.tsx              # Data fetching, state management
│   │   ├── BulletChartRow.tsx          # Individual KPI row with chart
│   │   ├── BulletChartDetailModal.tsx  # Detail view + plan value editor
│   │   ├── BulletChartMarker.tsx       # Diamond SVG marker (plan value)
│   │   ├── bulletChartRangeUtils.ts    # Core positioning algorithm
│   │   ├── mappers.ts                  # Supabase → ViewModel transformation
│   │   ├── types.ts                    # Shared TypeScript types
│   │   └── data/
│   │       └── mockKpis.ts             # Sample data fallback
│   ├── Header/
│   ├── FarmBar/
│   ├── Tabs/
│   └── ErrorBoundary.tsx
├── lib/
│   └── supabase.ts                     # Supabase client
└── test/
    ├── bulletChartRangeUtils.test.ts
    ├── mappers.test.ts
    ├── BulletChartRow.test.tsx
    ├── BulletChartDetailModal.test.tsx
    └── ErrorBoundary.test.tsx
e2e/
└── kpi.spec.ts                         # Playwright E2E tests
```

---

## Key Engineering Decisions

**Why no chart library?**

The bullet chart uses a fixed 5-tier visual system where each segment occupies exactly 20% of the bar width, regardless of the numeric distance between tier thresholds. This is a non-standard scale that doesn't map to any standard chart library abstraction. Building it directly gave full control over the positioning algorithm and avoided fighting library internals.

**Optimistic updates**

Plan value changes update the UI immediately without waiting for Supabase to confirm. If the server update fails, the UI rolls back by refetching the current server state. This is the same pattern used by tools like Linear and Notion.

**State ownership**

KPI data is owned in local state within `KPISection`, initialised from Supabase on mount. The component treats its local state as the source of truth, updated on confirmed server responses.

**Mock data fallback**

If Supabase is unreachable or not configured, the app falls back to static sample data. This ensures the app is always functional for anyone viewing the live demo without needing their own backend.

---

## Performance

**Small bundle footprint**

No chart library dependencies. The visualisation is built entirely from styled div elements and lightweight SVG primitives, keeping the initial bundle size small and parse time low.

**Memoised chart calculations**

Bullet chart segment generation and needle positioning are computed inside `useMemo`, scoped to each `BulletChartRow`. Calculations only re-run when the KPI data changes, not on unrelated parent re-renders.

```ts
const { directionality, segments } = useMemo(
  () => buildBulletChartRanges(kpi),
  [kpi],
);
```

**Isolated row components**

Each KPI row is a standalone component. When a plan value changes, only the affected row and the modal re-render — the rest of the list is unaffected. This is particularly important for dashboards with many KPI rows.

**Stable callbacks**

Event handlers in `KPISection` are wrapped in `useCallback` with stable dependency arrays, preventing unnecessary re-renders of child components that receive them as props.

**Optimistic updates**

Plan value changes update local state immediately without waiting for the network. The UI stays responsive and the Supabase write happens in the background, with a rollback if it fails.

---

## Accessibility

- All interactive elements are native `<button>` elements with descriptive `aria-label` attributes — compatible with screen readers and keyboard navigation out of the box.
- The detail modal uses `role="dialog"` and `aria-modal="true"` so assistive technologies correctly identify it as a modal context.
- The modal traps focus via keyboard: `Escape` closes it, `Enter` confirms edits — no mouse required.
- Directionality labels (↑ HIGHER IS BETTER / ↓ LOWER IS BETTER) are rendered with visible icons, so meaning is not lost without visual context.
- Colour is not used as the sole means of conveying tier information — each tier has a text label in addition to its colour.

---

## Getting Started

### Prerequisites

- Node.js 18+
- _(Optional)_ A Supabase project for plan value persistence

### Installation

```bash
git clone https://github.com/leomacode/kpi-dashboard.git
cd kpi-dashboard
npm install
npm run dev
```

The app runs on sample data by default. No Supabase account needed.

### Connecting Supabase _(optional)_

To enable plan value persistence, create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then run the following SQL in your Supabase SQL editor to create and seed the table:

```sql
-- Create table
create table kpis (
  id            text primary key,
  name          text not null,
  unit          text not null,
  value         float8 not null,
  plan_value    float8,
  min           float8 not null default 0,
  bronze        float8 not null,
  silver        float8 not null,
  gold          float8 not null,
  platinum      float8 not null,
  plateau_label text not null,
  explanation   text not null,
  directionality text not null
);

-- Seed data
insert into kpis values
  ('kpi-1', 'Pasture Access', 'hrs/year', 2000, 1500, 0, 720, 900, 1440, 4000, 'Gold',
   'Pasture access measures how many hours per year dairy cows spend outdoors. Higher values indicate better animal welfare and biodiversity outcomes.',
   'higher-is-better'),
  ('kpi-2', 'Bulk Milk Urea', 'mg/100mg', 17.5, 17, 0, 90, 20, 17, 5, 'Gold',
   'Bulk milk urea reflects the protein and energy balance in the cow''s diet. Lower values indicate more efficient nitrogen utilisation and reduced environmental impact.',
   'lower-is-better'),
  ('kpi-3', 'Nitrogen Farm Surplus', 'kg/ha', 105.9, 160, 0, 399, 165, 100, -40, 'Silver',
   'Farm nitrogen surplus is the difference between nitrogen inputs and outputs on the farm. Lower values indicate more efficient nitrogen use and less risk of environmental losses.',
   'lower-is-better'),
  ('kpi-4', 'Nitrogen Soil Surplus', 'kg N/ha', 57, 145, 0, 399, 150, 90, -20, 'Gold',
   'Soil nitrogen surplus reflects how much nitrogen remains in the soil after crop uptake. Reducing this surplus helps prevent groundwater contamination.',
   'lower-is-better'),
  ('kpi-5', 'Ammonia Emissions', 'kg NH3/ha', 50.9, 50, 0, 399, 60, 45, 0, 'Silver',
   'Ammonia emissions contribute to air pollution and nitrogen deposition in nature areas. Farms with lower emissions have better environmental performance.',
   'lower-is-better'),
  ('kpi-6', 'Species-Rich Grassland', '%', 18.4, 40, 0, 0, 10, 20, 60, 'Gold',
   'The percentage of species-rich grassland on the farm. Higher values indicate greater biodiversity and a healthier ecosystem.',
   'higher-is-better'),
  ('kpi-7', 'Nature Management Area', '%', 5.8, 4, 0, 0, 2.5, 10, 20, 'Silver',
   'The share of farmland under formal nature management agreements. Higher values show a stronger commitment to landscape and biodiversity conservation.',
   'higher-is-better');

-- Enable Row Level Security
alter table kpis enable row level security;
create policy "Allow public read" on kpis for select using (true);
create policy "Allow public update" on kpis for update using (true);
```

---

## Testing

### Unit + component tests

```bash
npm run test
```

Covers:

- `bulletChartRangeUtils` — tier calculation, needle positioning, segment generation
- `mappers` — Supabase snake_case to camelCase transformation
- `BulletChartRow` — rendering, directionality labels, click interaction
- `BulletChartDetailModal` — editing flow, keyboard shortcuts, close behaviour
- `ErrorBoundary` — error catching, fallback UI, retry

### E2E tests

```bash
npx playwright test
```

51 tests across Chromium, Firefox and WebKit covering:

- Page load and KPI row rendering
- Modal open/close (click, keyboard, overlay)
- Plan value editing and persistence
- Cross-browser behaviour

---

## Code Quality

```bash
npm run typecheck   # TypeScript — zero type errors
npm run lint        # ESLint — zero warnings
npm run build       # Production build
```

All three pass with zero errors or warnings.
