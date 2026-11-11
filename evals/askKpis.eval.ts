// Eval: runs every question in cases.ts through the real agent and model.
// Not part of `npm test` or CI — it needs an API key and spends quota.
//
//   npm run eval                      # all cases, model from AI_MODEL / default
//   EVAL_MODEL=google:gemini-3.5-flash-lite npm run eval
//   npm run eval -- -t gold-tier      # one case
//
// Writes evals/results/latest.json with per-case details and a summary.
import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import type { RenderChartResult } from "../src/components/AskKpis/chartSchema.js";
import { mockKpis } from "../src/components/KPISection/data/mockKpis.js";
import { mockHistory } from "../src/components/KPISection/data/mockHistory.js";
import { runAgent } from "../server/ai/agent.js";
import { DEFAULT_MODEL, getModel } from "../server/ai/model.js";
import { cases, type EvalCase } from "./cases.js";

const MODEL = process.env.EVAL_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;
// Free-tier quotas are per minute (e.g. 15 requests/min) and a case makes
// ~3 requests, so space the cases out.
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 12_000);

type Run = {
  id: string;
  question: string;
  // pass = correct; fail = wrong answer or behaviour; error = API/quota
  // failure, which says nothing about answer quality.
  status: "pass" | "fail" | "error";
  failures: string[];
  answer: string;
  toolCalls: { name: string; input: unknown }[];
  // Which model(s) actually answered — the fallback chain can switch.
  models: string[];
  chartAttempts: number;
  steps: number;
  ms: number;
  error?: string;
};

const runs: Run[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const text = (p: string | RegExp) =>
  typeof p === "string" ? `"${p}"` : String(p);
const has = (answer: string, p: string | RegExp) =>
  typeof p === "string"
    ? answer.toLowerCase().includes(p.toLowerCase())
    : p.test(answer);

function score(
  c: EvalCase,
  r: Omit<Run, "status" | "failures">,
  charts: RenderChartResult[],
) {
  const failures: string[] = [];
  const called = new Set(r.toolCalls.map((t) => t.name));
  const inputs = JSON.stringify(r.toolCalls.map((t) => t.input));

  if (r.error) return [`error: ${r.error}`];
  if (!r.answer.trim()) failures.push("empty answer");
  for (const t of c.tools ?? [])
    if (!called.has(t)) failures.push(`did not call ${t}`);
  if (c.anyTool && !c.anyTool.some((t) => called.has(t))) {
    failures.push(`called none of ${c.anyTool.join(", ")}`);
  }
  if (c.noTools && called.size > 0)
    failures.push(`called tools: ${[...called].join(", ")}`);
  for (const s of c.inputIncludes ?? []) {
    if (!inputs.includes(s)) failures.push(`no tool input contains "${s}"`);
  }
  if (c.chart && !charts.some((o) => o.ok && o.chart.type === c.chart)) {
    failures.push(`no valid ${c.chart} chart`);
  }
  for (const p of c.includes ?? [])
    if (!has(r.answer, p)) failures.push(`answer lacks ${text(p)}`);
  for (const p of c.excludes ?? [])
    if (has(r.answer, p)) failures.push(`answer contains ${text(p)}`);
  return failures;
}

describe(`Ask your KPIs eval (${MODEL})`, () => {
  cases.forEach((c, i) => {
    it(c.id, async () => {
      if (i > 0) await sleep(DELAY_MS);
      const started = Date.now();
      let error: string | undefined;

      const { result } = runAgent({
        model: getModel(MODEL),
        messages: [{ role: "user", content: c.question }],
        data: { kpis: mockKpis, history: mockHistory },
        onError: (e) => {
          error = e instanceof Error ? e.message : String(e);
        },
      });

      let steps: Awaited<typeof result.steps> = [];
      let answer = "";
      try {
        steps = await result.steps;
        answer = await result.text;
      } catch (e) {
        error ??= e instanceof Error ? e.message : String(e);
      }
      const toolCalls = steps.flatMap((s) =>
        s.toolCalls.map((t) => ({ name: t.toolName, input: t.input })),
      );
      const charts = steps
        .flatMap((s) => s.toolResults)
        .filter((t) => t.toolName === "renderChart")
        .map((t) => t.output as RenderChartResult);

      const run = {
        id: c.id,
        question: c.question,
        answer,
        toolCalls,
        models: [...new Set(steps.map((s) => s.response.modelId))],
        chartAttempts: charts.length,
        steps: steps.length,
        ms: Date.now() - started,
        error,
      };
      const failures = score(c, run, charts);
      runs.push({
        ...run,
        status: run.error ? "error" : failures.length ? "fail" : "pass",
        failures,
      });

      expect(failures, `answer: ${answer}`).toEqual([]);
    });
  });

  afterAll(() => {
    if (runs.length === 0) return;
    const count = (s: Run["status"]) =>
      runs.filter((r) => r.status === s).length;
    const avg = (f: (r: Run) => number) =>
      Math.round((runs.reduce((a, r) => a + f(r), 0) / runs.length) * 10) / 10;
    const summary = {
      model: MODEL,
      date: new Date().toISOString(),
      passed: count("pass"),
      failed: count("fail"),
      errored: count("error"),
      total: runs.length,
      avgToolCalls: avg((r) => r.toolCalls.length),
      avgSteps: avg((r) => r.steps),
      avgSeconds: avg((r) => r.ms / 1000),
      chartRetries: runs.reduce(
        (a, r) => a + Math.max(0, r.chartAttempts - 1),
        0,
      ),
    };

    console.table(
      runs.map((r) => ({
        case: r.id,
        result: { pass: "✓", fail: "✗", error: "! error" }[r.status],
        tools: r.toolCalls.map((t) => t.name).join(" → ") || "—",
        model: r.models.join(", "),
        s: Math.round(r.ms / 100) / 10,
        failures: r.failures.join("; "),
      })),
    );
    console.log(summary);

    mkdirSync("evals/results", { recursive: true });
    writeFileSync(
      "evals/results/latest.json",
      JSON.stringify({ summary, runs }, null, 2) + "\n",
    );
  });
});
