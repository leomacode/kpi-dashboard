import { tool } from "ai";
import { z } from "zod";
import type { KpiData } from "./data.js";
import type { KPIViewModel } from "../../src/components/KPISection/types.js";
import {
  compareKpi,
  findKpi,
  monthsWithData,
  periodLabel,
  type Comparison,
} from "./metrics.js";
import { MAX_CHART_ATTEMPTS, createChartRenderer } from "./charts.js";
import { ChartSpec } from "../../src/components/AskKpis/chartSchema.js";

// Embedded in the tool description so the model knows the exact shape.
const CHART_JSON_SCHEMA = JSON.stringify(z.toJSONSchema(ChartSpec));

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

export function createTools(data: KpiData) {
  const months = monthsWithData(data);
  const renderChart = createChartRenderer(data);

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
            `${comparisons.length} metric${comparisons.length === 1 ? "" : "s"}: ${periodLabel(periodA)} vs ${periodLabel(periodB)}` +
            (missing ? ` (${missing} without data)` : ""),
          periodA: periodLabel(periodA),
          periodB: periodLabel(periodB),
          comparisons,
        };
      },
    }),

    renderChart: tool({
      description:
        "Draw one chart under the answer. Pass `spec` as a JSON string matching this JSON Schema: " +
        CHART_JSON_SCHEMA +
        ` Use exact metric ids. The server fills in the numbers. If the result has ok=false, fix every listed error and call again (max ${MAX_CHART_ATTEMPTS} attempts). If gaveUp=true, stop and answer without a chart.`,
      inputSchema: z.object({
        spec: z.string().max(4_000).describe("Chart config as a JSON string"),
      }),
      execute: async ({ spec }) => renderChart(spec),
      // The browser needs the chart data; the model only needs the outcome.
      toModelOutput: ({ output }) => ({
        type: "json",
        value: output.ok
          ? { ok: true, summary: output.summary }
          : {
              ok: false,
              errors: output.errors,
              attemptsLeft: output.attemptsLeft,
              gaveUp: output.gaveUp,
            },
      }),
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
