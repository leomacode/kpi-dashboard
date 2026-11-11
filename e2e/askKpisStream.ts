// Builds the AI SDK "UI message stream" (SSE) that /api/ask returns, so the
// E2E tests can replay realistic agent runs without calling a real model.
// Shape verified against a live response from server/ai/handler.ts.

type Chunk = Record<string, unknown>;

export type ToolCall = { name: string; input: unknown; output: unknown };

export function agentStream({ tools = [], text }: { tools?: ToolCall[]; text: string }): string {
  const chunks: Chunk[] = [{ type: "start" }];

  tools.forEach((t, i) => {
    chunks.push(
      { type: "start-step" },
      { type: "tool-input-available", toolCallId: `call-${i}`, toolName: t.name, input: t.input },
      { type: "tool-output-available", toolCallId: `call-${i}`, output: t.output },
      { type: "finish-step" },
    );
  });

  chunks.push(
    { type: "start-step" },
    { type: "text-start", id: "t" },
    // Two deltas so the client really assembles a streamed answer.
    { type: "text-delta", id: "t", delta: text.slice(0, 10) },
    { type: "text-delta", id: "t", delta: text.slice(10) },
    { type: "text-end", id: "t" },
    { type: "finish-step" },
    { type: "finish" },
  );

  return chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
}

export const STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "x-vercel-ai-ui-message-stream": "v1",
};

// ─── Canned runs ─────────────────────────────────────────────────────────────

export const droppedMost = agentStream({
  tools: [
    {
      name: "comparePeriods",
      input: { periodA: { from: "2026-09" }, periodB: { from: "2026-10" } },
      output: { summary: "7 metrics: 2026-09 vs 2026-10", comparisons: [] },
    },
    {
      name: "renderChart",
      input: {
        spec: JSON.stringify({
          type: "bar",
          title: "Change from September to October",
          periodA: { from: "2026-09" },
          periodB: { from: "2026-10" },
        }),
      },
      output: {
        ok: true,
        summary: 'Drew bar chart "Change from September to October"',
        chart: {
          type: "bar",
          title: "Change from September to October",
          periodA: "2026-09",
          periodB: "2026-10",
          bars: [
            { id: "kpi-6", name: "Species-Rich Grassland", changePct: -18.58, verdict: "worsened" },
            { id: "kpi-4", name: "Nitrogen Soil Surplus", changePct: -3.39, verdict: "improved" },
            { id: "kpi-2", name: "Bulk Milk Urea", changePct: 1.74, verdict: "worsened" },
          ],
        },
      },
    },
  ],
  text: "Species-Rich Grassland dropped most: from 22.6 % to 18.4 % (−18.6 %), which is a worsening.",
});

const invalidChart = (attempt: number) => ({
  name: "renderChart",
  input: { spec: '{"type":"pie"}' },
  output: {
    ok: false,
    summary:
      attempt === 3
        ? "Chart invalid 3/3, giving up: type: Invalid discriminator value"
        : `Chart invalid (attempt ${attempt}/3): type: Invalid discriminator value`,
    attempt,
    attemptsLeft: 3 - attempt,
    gaveUp: attempt === 3,
    errors: ["type: Invalid discriminator value"],
  },
});

export const chartGaveUp = agentStream({
  tools: [invalidChart(1), invalidChart(2), invalidChart(3)],
  text: "Ammonia emissions fell from 58 to 50.9 kg NH3/ha over the year.",
});

export const simpleAnswer = agentStream({ text: "Four metrics are in the Gold tier." });
