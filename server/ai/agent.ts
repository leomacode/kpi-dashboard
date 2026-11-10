import { isStepCount, streamText, type LanguageModel, type ModelMessage } from "ai";
import type { KpiData } from "./data.js";
import { createTools } from "./tools.js";

// Hard ceiling on model ↔ tool round-trips per question.
export const MAX_STEPS = 8;

export function buildInstructions(data: KpiData, today: Date): string {
  const months = [...new Set(data.history.map((p) => p.month))].sort();
  const metrics = data.kpis.map((k) => `- ${k.id}: ${k.name} (${k.unit}, ${k.directionality})`);
  return [
    "You answer questions about a farm's sustainability KPIs.",
    `Today is ${today.toISOString().slice(0, 10)}. Monthly data covers ${months[0]} to ${months[months.length - 1]}; "last month" means the latest month with data.`,
    "Metrics:",
    ...metrics,
    "Rules:",
    "- Use the tools for every number you state. Never guess or invent values.",
    "- Respect directionality: for lower-is-better metrics a decrease is an improvement.",
    "- If a question is outside this data, say so briefly.",
    "- Answer in plain text (no markdown), in at most a few short sentences, and always include units.",
  ].join("\n");
}

export function runAgent({
  model,
  messages,
  data,
  today = new Date(),
}: {
  model: LanguageModel;
  messages: ModelMessage[];
  data: KpiData;
  today?: Date;
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
    }),
  };
}
