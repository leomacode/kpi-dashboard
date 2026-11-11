// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Tool } from "ai";
import { mockKpis } from "../../src/components/KPISection/data/mockKpis.js";
import { mockHistory } from "../../src/components/KPISection/data/mockHistory.js";
import type { KpiData } from "./data.js";
import { averageInPeriod, compareKpi, findKpi } from "./metrics.js";
import { createTools } from "./tools.js";

const data: KpiData = { kpis: mockKpis, history: mockHistory };
const tools = createTools(data);

// Call a tool's execute() the way the agent loop would.
async function run<I, O>(t: Tool<I, O>, input: I): Promise<O> {
  if (!t.execute) throw new Error("tool has no execute");
  return (await t.execute(input, {
    toolCallId: "test",
    messages: [],
    context: {},
  })) as O;
}

const kpi = (id: string) => findKpi(data.kpis, id)!;

// ─── metrics ─────────────────────────────────────────────────────────────────

describe("findKpi", () => {
  it("matches by id or by name, case-insensitively", () => {
    expect(findKpi(data.kpis, "kpi-6")?.name).toBe("Species-Rich Grassland");
    expect(findKpi(data.kpis, "  species-rich grassland ")?.id).toBe("kpi-6");
  });

  it("returns undefined for an unknown metric", () => {
    expect(findKpi(data.kpis, "kpi-99")).toBeUndefined();
  });
});

describe("averageInPeriod", () => {
  it("averages the months in an inclusive range", () => {
    // Nitrogen Farm Surplus Q1 2026: 135, 131, 128
    expect(
      averageInPeriod(data, "kpi-3", { from: "2026-01", to: "2026-03" }),
    ).toBeCloseTo(131.333, 3);
  });

  it("treats a missing `to` as a single month", () => {
    expect(averageInPeriod(data, "kpi-6", { from: "2026-10" })).toBe(18.4);
  });

  it("returns null when the range has no data", () => {
    expect(averageInPeriod(data, "kpi-6", { from: "2020-01" })).toBeNull();
  });
});

describe("compareKpi", () => {
  const sep = { from: "2026-09" };
  const oct = { from: "2026-10" };

  it("rounds away float noise", () => {
    const c = compareKpi(data, kpi("kpi-6"), sep, oct)!;
    expect(c).toMatchObject({
      a: 22.6,
      b: 18.4,
      change: -4.2,
      changePct: -18.58,
    });
  });

  it("calls a decrease 'worsened' for higher-is-better metrics", () => {
    expect(compareKpi(data, kpi("kpi-6"), sep, oct)?.verdict).toBe("worsened");
  });

  it("calls a decrease 'improved' for lower-is-better metrics", () => {
    // Nitrogen Soil Surplus 59 → 57
    expect(compareKpi(data, kpi("kpi-4"), sep, oct)?.verdict).toBe("improved");
  });

  it("calls an increase 'worsened' for lower-is-better metrics", () => {
    // Bulk Milk Urea 17.2 → 17.5
    expect(compareKpi(data, kpi("kpi-2"), sep, oct)?.verdict).toBe("worsened");
  });

  it("reports 'unchanged' when the value is flat", () => {
    expect(compareKpi(data, kpi("kpi-7"), sep, oct)).toMatchObject({
      change: 0,
      verdict: "unchanged",
    });
  });

  it("returns null changePct when the base value is zero", () => {
    const zero: KpiData = {
      kpis: data.kpis,
      history: [
        { kpiId: "kpi-1", month: "2026-01", value: 0 },
        { kpiId: "kpi-1", month: "2026-02", value: 5 },
      ],
    };
    expect(
      compareKpi(zero, kpi("kpi-1"), { from: "2026-01" }, { from: "2026-02" })
        ?.changePct,
    ).toBeNull();
  });
});

// ─── tools ───────────────────────────────────────────────────────────────────

describe("listMetrics", () => {
  it("lists every metric and the month range", async () => {
    const out = await run(tools.listMetrics, {});
    expect(out.metrics).toHaveLength(7);
    expect(out.range).toEqual({ from: "2025-11", to: "2026-10" });
    expect(out.summary).toBe("7 metrics, data 2025-11 → 2026-10");
  });

  it("filters by tier and directionality", async () => {
    const gold = await run(tools.listMetrics, { tier: "Gold" });
    expect(gold.metrics.map((m) => m.id)).toEqual([
      "kpi-1",
      "kpi-2",
      "kpi-4",
      "kpi-6",
    ]);

    const lower = await run(tools.listMetrics, {
      directionality: "lower-is-better",
    });
    expect(lower.metrics.map((m) => m.id)).toEqual([
      "kpi-2",
      "kpi-3",
      "kpi-4",
      "kpi-5",
    ]);
  });
});

describe("queryMetric", () => {
  it("returns the monthly series within the range", async () => {
    const out = await run(tools.queryMetric, {
      metric: "kpi-5",
      from: "2026-08",
      to: "2026-10",
    });
    if (!("points" in out)) throw new Error(out.error);
    expect(out.points).toEqual([
      { month: "2026-08", value: 51.5 },
      { month: "2026-09", value: 51.1 },
      { month: "2026-10", value: 50.9 },
    ]);
    expect(out).toMatchObject({ current: 50.9, plan: 50, unit: "kg NH3/ha" });
  });

  it("returns all 12 months without a range", async () => {
    const out = await run(tools.queryMetric, { metric: "Ammonia Emissions" });
    if (!("points" in out)) throw new Error(out.error);
    expect(out.points).toHaveLength(12);
  });

  it("returns an error listing valid ids for an unknown metric", async () => {
    const out = await run(tools.queryMetric, { metric: "kpi-99" });
    expect(out).toMatchObject({ summary: 'Unknown metric "kpi-99"' });
    expect("error" in out && out.error).toContain("kpi-1 (Pasture Access)");
  });
});

describe("comparePeriods", () => {
  it("compares all metrics in one call, biggest relative drop first", async () => {
    const out = await run(tools.comparePeriods, {
      periodA: { from: "2026-09" },
      periodB: { from: "2026-10" },
    });
    if (!("comparisons" in out)) throw new Error(out.error);
    expect(out.comparisons).toHaveLength(7);
    expect(out.comparisons[0]).toMatchObject({
      id: "kpi-6",
      changePct: -18.58,
    });
    expect(out.comparisons[out.comparisons.length - 1].id).toBe("kpi-2"); // only increase
    expect(out.summary).toBe("7 metrics: 2026-09 vs 2026-10");
  });

  it("compares month ranges for selected metrics", async () => {
    const out = await run(tools.comparePeriods, {
      metrics: ["kpi-3"],
      periodA: { from: "2026-01", to: "2026-03" },
      periodB: { from: "2026-07", to: "2026-09" },
    });
    if (!("comparisons" in out)) throw new Error(out.error);
    // Q1 (135, 131, 128) avg 131.33 → Q3 (113, 110, 108.4) avg 110.47
    expect(out.comparisons[0]).toMatchObject({
      a: 131.33,
      b: 110.47,
      change: -20.87,
      verdict: "improved",
    });
    expect(out.periodA).toBe("2026-01…2026-03");
  });

  it("rejects unknown metrics without partial results", async () => {
    const out = await run(tools.comparePeriods, {
      metrics: ["kpi-1", "nope"],
      periodA: { from: "2026-09" },
      periodB: { from: "2026-10" },
    });
    expect(out).toMatchObject({ summary: 'Unknown metric "nope"' });
  });
});
