import { tool } from "ai";
import { z } from "zod";
import type { KpiData } from "./data.js";
import type { KPIViewModel } from "../../src/components/KPISection/types.js";

const Month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM, e.g. 2026-10");

const MetricRef = z
  .string()
  .min(1)
  .describe('Metric id (e.g. "kpi-6") or exact metric name');

// Every tool returns `summary`: one human-readable line shown in the
// "show the work" panel. The rest of the object is for the model.
type ToolError = { summary: string; error: string };

export function findKpi(
  kpis: KPIViewModel[],
  ref: string,
): KPIViewModel | undefined {
  const needle = ref.trim().toLowerCase();
  return kpis.find(
    (k) => k.id.toLowerCase() === needle || k.name.toLowerCase() === needle,
  );
}

const unknownMetric = (kpis: KPIViewModel[], ref: string): ToolError => ({
  summary: `Unknown metric "${ref}"`,
  error: `Unknown metric "${ref}". Available: ${kpis
    .map((k) => `${k.id} (${k.name})`)
    .join(", ")}`,
});

const Period = z
  .object({
    from: Month,
    to: Month.optional().describe("Defaults to `from` (a single month)"),
  })
  .describe("Month range, inclusive. Values in the range are averaged.");

type Period = z.infer<typeof Period>;

// Float noise (22.6 - 18.4 = 4.200000000000003) would leak into answers.
const round = (n: number) => Math.round(n * 100) / 100;

const label = (p: Period) => (p.to && p.to !== p.from ? `${p.from}…${p.to}` : p.from);

export function averageInPeriod(
  data: KpiData,
  kpiId: string,
  { from, to = from }: Period,
): number | null {
  const values = data.history
    .filter((p) => p.kpiId === kpiId && p.month >= from && p.month <= to)
    .map((p) => p.value);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
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
  const better = kpi.directionality === "higher-is-better" ? change > 0 : change < 0;
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

export function createTools(data: KpiData) {
  const months = [...new Set(data.history.map((p) => p.month))].sort();

  return {
    listMetrics: tool({
      description:
        "List the available metrics with id, unit, directionality, current value, plan target, tier, and the month range that has data. Optionally filter.",
      inputSchema: z.object({
        directionality: z.enum(["higher-is-better", "lower-is-better"]).optional(),
        tier: z
          .enum(["Aspirant", "Bronze", "Silver", "Gold", "Platinum"])
          .optional()
          .describe("Only metrics currently in this tier"),
      }),
      execute: async ({ directionality, tier }) => {
        const metrics = data.kpis
          .filter(
            (k) =>
              (!directionality || k.directionality === directionality) &&
              (!tier || k.plateauLabel === tier),
          )
          .map((k) => ({
            id: k.id,
            name: k.name,
            unit: k.unit,
            directionality: k.directionality,
            current: k.value,
            plan: k.planValue,
            tier: k.plateauLabel,
          }));
        const range = { from: months[0], to: months[months.length - 1] };
        return {
          summary: `${metrics.length} metric${metrics.length === 1 ? "" : "s"}, data ${range.from} → ${range.to}`,
          range,
          metrics,
        };
      },
    }),

    comparePeriods: tool({
      description:
        "Compare metrics between period A (earlier) and period B (later). Omit `metrics` to compare all of them in one call. Results are sorted by changePct ascending (biggest relative decrease first). `verdict` accounts for directionality.",
      inputSchema: z.object({
        metrics: z.array(MetricRef).min(1).optional().describe("Omit for all metrics"),
        periodA: Period,
        periodB: Period,
      }),
      execute: async ({ metrics, periodA, periodB }) => {
        const unknown = (metrics ?? []).filter((m) => !findKpi(data.kpis, m));
        if (unknown.length) return unknownMetric(data.kpis, unknown.join(", "));

        const kpis = metrics
          ? metrics.map((m) => findKpi(data.kpis, m) as KPIViewModel)
          : data.kpis;
        const comparisons = kpis
          .map((k) => compareKpi(data, k, periodA, periodB))
          .filter((c): c is Comparison => c !== null)
          .sort((x, y) => (x.changePct ?? 0) - (y.changePct ?? 0));

        const missing = kpis.length - comparisons.length;
        return {
          summary:
            `${comparisons.length} metric${comparisons.length === 1 ? "" : "s"}: ${label(periodA)} vs ${label(periodB)}` +
            (missing ? ` (${missing} without data)` : ""),
          periodA: label(periodA),
          periodB: label(periodB),
          comparisons,
        };
      },
    }),

    queryMetric: tool({
      description:
        "Monthly values for one metric, optionally limited to a month range (inclusive). Also returns the current value, plan target and tier.",
      inputSchema: z.object({
        metric: MetricRef,
        from: Month.optional().describe("First month, inclusive"),
        to: Month.optional().describe("Last month, inclusive"),
      }),
      execute: async ({ metric, from, to }) => {
        const kpi = findKpi(data.kpis, metric);
        if (!kpi) return unknownMetric(data.kpis, metric);

        // "YYYY-MM" strings sort chronologically, so plain comparison works.
        const points = data.history
          .filter(
            (p) =>
              p.kpiId === kpi.id &&
              (!from || p.month >= from) &&
              (!to || p.month <= to),
          )
          .map(({ month, value }) => ({ month, value }));

        const range = points.length
          ? `${points[0].month} → ${points[points.length - 1].month}`
          : "no data in range";

        return {
          summary: `${kpi.name}: ${points.length} monthly values (${range})`,
          id: kpi.id,
          name: kpi.name,
          unit: kpi.unit,
          directionality: kpi.directionality,
          current: kpi.value,
          plan: kpi.planValue,
          tier: kpi.plateauLabel,
          points,
        };
      },
    }),
  };
}

export type KpiTools = ReturnType<typeof createTools>;
