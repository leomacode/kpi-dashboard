import type { KpiHistoryPoint } from "../types";

// Twelve monthly readings per KPI, Nov 2025 → Oct 2026. The last reading of
// each series equals the KPI's current `value` in mockKpis.ts, so the chat
// agent and the bullet chart never disagree. Mirrors the seed in
// supabase/schema.sql — keep the two in sync.
export const HISTORY_MONTHS = [
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
] as const;

const SERIES: Record<string, readonly number[]> = {
  "kpi-1": [1650, 1680, 1700, 1720, 1760, 1800, 1850, 1900, 1950, 2120, 2080, 2000],
  "kpi-2": [21, 20.5, 20.1, 19.8, 19.2, 18.9, 18.5, 18.2, 17.9, 17.6, 17.2, 17.5],
  "kpi-3": [142, 138, 135, 131, 128, 124, 120, 117, 113, 110, 108.4, 105.9],
  "kpi-4": [98, 95, 90, 86, 81, 77, 72, 68, 65, 61, 59, 57],
  "kpi-5": [58, 57.4, 56.8, 56, 55.1, 54.3, 53.6, 52.8, 52.2, 51.5, 51.1, 50.9],
  "kpi-6": [12, 12.5, 13.1, 13.8, 14.6, 15.5, 16.4, 17.3, 18.9, 21.2, 22.6, 18.4],
  "kpi-7": [4.2, 4.3, 4.5, 4.6, 4.8, 5, 5.1, 5.3, 5.5, 5.6, 5.8, 5.8],
};

export const mockHistory: KpiHistoryPoint[] = Object.entries(SERIES).flatMap(
  ([kpiId, values]) =>
    values.map((value, i) => ({ kpiId, month: HISTORY_MONTHS[i], value })),
);
