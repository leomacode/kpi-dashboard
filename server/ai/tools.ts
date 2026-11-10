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

export function createTools(data: KpiData) {
  return {
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
