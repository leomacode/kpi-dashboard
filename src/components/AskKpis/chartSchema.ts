import { z } from "zod";
import type { KPIViewModel } from "../KPISection/types";

// ─── What the model writes ───────────────────────────────────────────────────
// The model only chooses a chart type, metrics and months. The server fills in
// every number from the data (server/ai/charts.ts), so a chart can never show
// a value the model made up.

const Title = z.string().trim().min(1).max(80);
const MetricId = z.string().describe('Exact metric id, e.g. "kpi-6"');
const Month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM, e.g. 2026-10");
const Period = z
  .object({ from: Month, to: Month.optional() })
  .strict()
  .describe("Month range, inclusive; `to` defaults to `from`");

export const ChartSpec = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("bullet"),
      title: Title,
      metricIds: z.array(MetricId).min(1).max(7),
    })
    .strict()
    .describe("Current value vs tiers and plan, using the dashboard's bullet chart"),
  z
    .object({
      type: z.literal("line"),
      title: Title,
      metricId: MetricId,
      from: Month.optional(),
      to: Month.optional(),
    })
    .strict()
    .describe("One metric's monthly values over time"),
  z
    .object({
      type: z.literal("bar"),
      title: Title,
      metricIds: z.array(MetricId).min(1).max(7).optional().describe("Omit for all metrics"),
      periodA: Period,
      periodB: Period,
    })
    .strict()
    .describe("% change per metric from period A to period B"),
]);

export type ChartSpec = z.infer<typeof ChartSpec>;

// ─── What the browser renders ────────────────────────────────────────────────

export type BulletChartData = {
  type: "bullet";
  title: string;
  kpis: KPIViewModel[];
};

export type LineChartData = {
  type: "line";
  title: string;
  name: string;
  unit: string;
  plan: number | null;
  points: { month: string; value: number }[];
};

export type BarChartData = {
  type: "bar";
  title: string;
  periodA: string;
  periodB: string;
  bars: {
    id: string;
    name: string;
    changePct: number;
    verdict: "improved" | "worsened" | "unchanged";
  }[];
};

export type ChartData = BulletChartData | LineChartData | BarChartData;

// Output of the renderChart tool (server/ai/tools.ts).
export type RenderChartResult =
  | { ok: true; summary: string; chart: ChartData }
  | {
      ok: false;
      summary: string;
      attempt: number;
      attemptsLeft: number;
      gaveUp: boolean;
      errors: string[];
    };
