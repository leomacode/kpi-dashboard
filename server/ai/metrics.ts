import type { KpiData } from "./data.js";
import type { KPIViewModel } from "../../src/components/KPISection/types.js";

// Pure calculations over KPI data, shared by the tools and the chart resolver.

export type Period = { from: string; to?: string };

export function findKpi(
  kpis: KPIViewModel[],
  ref: string,
): KPIViewModel | undefined {
  const needle = ref.trim().toLowerCase();
  return kpis.find(
    (k) => k.id.toLowerCase() === needle || k.name.toLowerCase() === needle,
  );
}

// "YYYY-MM" strings sort chronologically, so plain string sort/compare works.
export const monthsWithData = (data: KpiData) =>
  [...new Set(data.history.map((p) => p.month))].sort();

// One metric's monthly points, optionally limited to a month range (inclusive).
// "YYYY-MM" strings sort chronologically, so plain comparison works.
export const seriesInRange = (
  data: KpiData,
  kpiId: string,
  from?: string,
  to?: string,
) =>
  data.history
    .filter(
      (p) =>
        p.kpiId === kpiId &&
        (!from || p.month >= from) &&
        (!to || p.month <= to),
    )
    .map(({ month, value }) => ({ month, value }));

// Float noise (22.6 - 18.4 = 4.200000000000003) would leak into answers.
export const round = (n: number) => Math.round(n * 100) / 100;

export const periodLabel = (p: Period) =>
  p.to && p.to !== p.from ? `${p.from}…${p.to}` : p.from;

export function averageInPeriod(
  data: KpiData,
  kpiId: string,
  { from, to = from }: Period,
): number | null {
  const values = data.history
    .filter((p) => p.kpiId === kpiId && p.month >= from && p.month <= to)
    .map((p) => p.value);
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}

export type Comparison = {
  id: string;
  name: string;
  unit: string;
  directionality: KPIViewModel["directionality"];
  a: number;
  b: number;
  change: number;
  changePct: number | null;
  verdict: "improved" | "worsened" | "unchanged";
};

export function compareKpi(
  data: KpiData,
  kpi: KPIViewModel,
  periodA: Period,
  periodB: Period,
): Comparison | null {
  const a = averageInPeriod(data, kpi.id, periodA);
  const b = averageInPeriod(data, kpi.id, periodB);
  if (a === null || b === null) return null;

  const change = b - a;
  const better =
    kpi.directionality === "higher-is-better" ? change > 0 : change < 0;
  return {
    id: kpi.id,
    name: kpi.name,
    unit: kpi.unit,
    directionality: kpi.directionality,
    a: round(a),
    b: round(b),
    change: round(change),
    changePct: a === 0 ? null : round((change / Math.abs(a)) * 100),
    verdict: change === 0 ? "unchanged" : better ? "improved" : "worsened",
  };
}
