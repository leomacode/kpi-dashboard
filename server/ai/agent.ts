import { isStepCount, streamText, type LanguageModel, type ModelMessage } from "ai";
import type { KpiData } from "./data.js";
import { createTools } from "./tools.js";

// Hard ceiling on model ↔ tool round-trips per question.
export const MAX_STEPS = 8;

// Fail fast instead of leaving the UI spinning: an overloaded free-tier model
// can stall a stream indefinitely. The serverless function stops long before
// any platform limit.
export const TIMEOUT = { totalMs: 45_000, firstChunkMs: 20_000, chunkMs: 15_000 };

export function buildInstructions(data: KpiData, today: Date): string {
  const months = [...new Set(data.history.map((p) => p.month))].sort();
  return [
    "You answer questions about a farm's sustainability KPIs.",
    `Today is ${today.toISOString().slice(0, 10)}. Monthly data covers ${months[0]} to ${months[months.length - 1]}; "last month" means the latest month with data.`,
    "Tools: listMetrics for ids, units, plans and tiers; comparePeriods to compare periods (omit `metrics` to cover all at once); queryMetric for one metric's monthly series.",
    "Prefer the fewest tool calls: for questions across all metrics use one comparePeriods or listMetrics call, not one call per metric.",
    "Rules:",
    "- Use the tools for every number you state. Never guess or invent values.",
    "- Respect directionality: for lower-is-better metrics a decrease is an improvement.",
    "- \"Dropped most\" means the largest relative decrease (%) unless the user asks otherwise; mention whether that is good or bad.",
    "- If a question is outside this data, say so briefly.",
    "- Answer in plain text (no markdown), in at most a few short sentences, and always include units.",
  ].join("\n");
}

export function runAgent({
  model,
  messages,
  data,
  today = new Date(),
  onError,
}: {
  model: LanguageModel;
  messages: ModelMessage[];
  data: KpiData;
  today?: Date;
  // Replaces streamText's default console.error so each error is logged once.
  onError: (error: unknown) => void;
}) {
  const tools = createTools(data);
  return {
    tools,
    result: streamText({
      model,
      instructions: buildInstructions(data, today),
      messages,
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      timeout: TIMEOUT,
      // Retry provider errors that arrive after streaming started (e.g. a
      // mid-stream 503 "high demand"); off by default in the SDK.
      streamRetries: 2,
      onError: ({ error }) => onError(error),
    }),
  };
}
