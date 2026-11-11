// @vitest-environment node
import { describe, expect, it } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { mockKpis } from "../../src/components/KPISection/data/mockKpis.js";
import { mockHistory } from "../../src/components/KPISection/data/mockHistory.js";
import type { RenderChartResult } from "../../src/components/AskKpis/chartSchema.js";
import { runAgent } from "./agent.js";
import { createChartRenderer, parseChartSpec, resolveChart } from "./charts.js";
import type { KpiData } from "./data.js";

const data: KpiData = { kpis: mockKpis, history: mockHistory };

const errorsOf = (json: string) => {
  const r = parseChartSpec(json, data);
  return r.ok ? [] : r.errors;
};

const LINE = JSON.stringify({ type: "line", title: "Ammonia", metricId: "kpi-5" });
const BAR = JSON.stringify({
  type: "bar",
  title: "Last month",
  periodA: { from: "2026-09" },
  periodB: { from: "2026-10" },
});
const BAD = JSON.stringify({ type: "pie", title: "x" });

// ─── Validation ──────────────────────────────────────────────────────────────

describe("parseChartSpec", () => {
  it("accepts each chart type", () => {
    expect(parseChartSpec(LINE, data).ok).toBe(true);
    expect(parseChartSpec(BAR, data).ok).toBe(true);
    expect(
      parseChartSpec(JSON.stringify({ type: "bullet", title: "Now", metricIds: ["kpi-1"] }), data).ok,
    ).toBe(true);
  });

  it("reports invalid JSON", () => {
    expect(errorsOf("{type: line")[0]).toMatch(/^spec is not valid JSON/);
  });

  it("reports an unknown chart type with the allowed values", () => {
    expect(errorsOf(BAD)[0]).toMatch(/^type: .*bullet.*line.*bar/);
  });

  it("reports missing and extra fields with their paths", () => {
    const errors = errorsOf(JSON.stringify({ type: "line", title: "x", color: "red" }));
    expect(errors.some((e) => e.startsWith("metricId:"))).toBe(true);
    expect(errors.some((e) => e.includes("color"))).toBe(true);
  });

  it("rejects malformed months", () => {
    const errors = errorsOf(JSON.stringify({ type: "line", title: "x", metricId: "kpi-1", from: "2026-13" }));
    expect(errors[0]).toMatch(/^from: Use YYYY-MM/);
  });

  it("rejects unknown metric ids and lists the valid ones", () => {
    const errors = errorsOf(JSON.stringify({ type: "bullet", title: "x", metricIds: ["kpi-1", "kpi-42"] }));
    expect(errors).toEqual([
      'metricIds.1: unknown metric id "kpi-42". Valid ids: kpi-1, kpi-2, kpi-3, kpi-4, kpi-5, kpi-6, kpi-7',
    ]);
  });

  it("rejects months outside the data and reversed ranges", () => {
    const errors = errorsOf(
      JSON.stringify({ type: "line", title: "x", metricId: "kpi-1", from: "2026-10", to: "2024-01" }),
    );
    expect(errors).toEqual([
      "to: 2024-01 has no data; data covers 2025-11 to 2026-10",
      "from: 2026-10 is after to: 2024-01",
    ]);
  });
});

describe("resolveChart", () => {
  it("fills a line chart from the data, not from the model", () => {
    const r = parseChartSpec(JSON.stringify({ type: "line", title: "x", metricId: "kpi-5", from: "2026-09" }), data);
    if (!r.ok) throw new Error(r.errors.join());
    expect(resolveChart(r.spec, data)).toEqual({
      type: "line",
      title: "x",
      name: "Ammonia Emissions",
      unit: "kg NH3/ha",
      plan: 50,
      points: [
        { month: "2026-09", value: 51.1 },
        { month: "2026-10", value: 50.9 },
      ],
    });
  });

  it("sorts bar chart rows by biggest relative drop", () => {
    const r = parseChartSpec(BAR, data);
    if (!r.ok) throw new Error(r.errors.join());
    const chart = resolveChart(r.spec, data);
    if (chart.type !== "bar") throw new Error("expected bar");
    expect(chart.bars.map((b) => b.id)).toEqual(["kpi-6", "kpi-1", "kpi-4", "kpi-3", "kpi-5", "kpi-7", "kpi-2"]);
    expect(chart.bars[0]).toEqual({ id: "kpi-6", name: "Species-Rich Grassland", changePct: -18.58, verdict: "worsened" });
  });

  it("strips the long explanation text from bullet chart KPIs", () => {
    const r = parseChartSpec(JSON.stringify({ type: "bullet", title: "x", metricIds: ["kpi-2"] }), data);
    if (!r.ok) throw new Error(r.errors.join());
    const chart = resolveChart(r.spec, data);
    expect(chart.type === "bullet" && chart.kpis[0]).toMatchObject({ id: "kpi-2", value: 17.5, explanation: "" });
  });
});

// ─── Retry loop ──────────────────────────────────────────────────────────────

describe("createChartRenderer (retry loop)", () => {
  it("returns the chart on a valid first attempt", () => {
    const out = createChartRenderer(data)(LINE);
    expect(out).toMatchObject({ ok: true, summary: 'Drew line chart "Ammonia"' });
  });

  it("returns errors with attempts left, then succeeds on a corrected spec", () => {
    const render = createChartRenderer(data);
    expect(render(BAD)).toMatchObject({ ok: false, attempt: 1, attemptsLeft: 2, gaveUp: false });
    expect(render("{oops")).toMatchObject({ ok: false, attempt: 2, attemptsLeft: 1, gaveUp: false });
    expect(render(LINE)).toMatchObject({ ok: true });
  });

  it("gives up after 3 invalid attempts", () => {
    const render = createChartRenderer(data);
    render(BAD);
    render(BAD);
    const third = render(BAD);
    expect(third).toMatchObject({ ok: false, attempt: 3, attemptsLeft: 0, gaveUp: true });
    expect(third.summary).toMatch(/^Chart invalid 3\/3, giving up/);
  });

  it("refuses further attempts after giving up, even valid ones", () => {
    const render = createChartRenderer(data);
    render(BAD);
    render(BAD);
    render(BAD);
    expect(render(LINE)).toMatchObject({ ok: false, gaveUp: true, attempt: 3 });
  });

  it("starts a fresh count for a second chart after a success", () => {
    const render = createChartRenderer(data);
    render(BAD);
    render(BAD);
    render(LINE);
    expect(render(BAD)).toMatchObject({ attempt: 1, gaveUp: false });
  });

  it("honours a custom attempt limit", () => {
    expect(createChartRenderer(data, 1)(BAD)).toMatchObject({ gaveUp: true });
  });
});

// ─── Retry loop inside the real agent loop (scripted model) ──────────────────

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

// A fake model that plays back one scripted step per call: either a
// renderChart call with the given spec, or a final text answer.
type StreamPart =
  Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"] extends ReadableStream<infer P>
    ? P
    : never;

const toolStep = (call: number, spec: string): StreamPart[] => [
  { type: "tool-call", toolCallId: `c${call}`, toolName: "renderChart", input: JSON.stringify({ spec }) },
  { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
];

const textStep = (text: string): StreamPart[] => [
  { type: "text-start", id: "t" },
  { type: "text-delta", id: "t", delta: text },
  { type: "text-end", id: "t" },
  { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
];

function scriptedModel(steps: (string | { text: string })[]) {
  let call = 0;
  const model = new MockLanguageModelV4({
    doStream: async () => {
      const step = steps[call++];
      const chunks = typeof step === "string" ? toolStep(call, step) : textStep(step.text);
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
  return { model, calls: () => call, prompts: () => model.doStreamCalls.map((c) => c.prompt) };
}

async function runScript(steps: (string | { text: string })[]) {
  const scripted = scriptedModel(steps);
  const { result } = runAgent({
    model: scripted.model,
    messages: [{ role: "user", content: "chart please" }],
    data,
    onError: (e) => {
      throw e;
    },
  });
  const all = await result.steps;
  const outputs = all
    .flatMap((s) => s.toolResults)
    .map((r) => r.output as RenderChartResult);
  return { outputs, text: await result.text, scripted };
}

describe("chart retry inside the agent loop", () => {
  it("feeds validation errors back to the model, which then fixes the spec", async () => {
    const { outputs, text, scripted } = await runScript([BAD, "{oops", LINE, { text: "Here it is." }]);

    expect(outputs.map((o) => o.ok)).toEqual([false, false, true]);
    expect(text).toBe("Here it is.");
    expect(scripted.calls()).toBe(4);

    // The model's 2nd call must contain the errors from attempt 1 —
    // that is the feedback the retry relies on.
    const secondPrompt = JSON.stringify(scripted.prompts()[1]);
    expect(secondPrompt).toContain("type: Invalid discriminator value");
    expect(secondPrompt).toContain('"attemptsLeft":2');
    // …but never the chart data itself (toModelOutput keeps it out).
    const fourthPrompt = JSON.stringify(scripted.prompts()[3]);
    expect(fourthPrompt).not.toContain("50.9");
  });

  it("stops after 3 failures and the model answers without a chart", async () => {
    const { outputs, text } = await runScript([BAD, BAD, BAD, { text: "No chart, sorry." }]);
    expect(outputs).toHaveLength(3);
    expect(outputs[2]).toMatchObject({ ok: false, gaveUp: true });
    expect(text).toBe("No chart, sorry.");
  });
});
