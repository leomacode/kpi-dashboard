import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { ChartData, RenderChartResult } from "./chartSchema";

export type ToolStep = {
  id: string;
  name: string;
  input: unknown;
  status: "running" | "done" | "error";
  // Server tools return { summary } (see server/ai/tools.ts); errors carry text.
  result: string;
};

const summaryOf = (output: unknown): string =>
  typeof output === "object" &&
  output !== null &&
  "summary" in output &&
  typeof output.summary === "string"
    ? output.summary
    : "Done";

// renderChart takes its chart config as a JSON string; show it as an object.
function displayInput(input: unknown): unknown {
  if (typeof input !== "object" || input === null || !("spec" in input)) return input;
  if (typeof input.spec !== "string") return input;
  try {
    return { spec: JSON.parse(input.spec) };
  } catch {
    return input; // invalid JSON is exactly what the model sent — show it raw
  }
}

export function toToolSteps(message: UIMessage): ToolStep[] {
  return message.parts.filter(isToolUIPart).map((part) => {
    const base = { id: part.toolCallId, name: getToolName(part), input: displayInput(part.input) };
    switch (part.state) {
      case "output-available": {
        // A tool can run fine yet report failure, e.g. an invalid chart spec.
        const failed =
          typeof part.output === "object" &&
          part.output !== null &&
          "ok" in part.output &&
          part.output.ok === false;
        return { ...base, status: failed ? "error" : "done", result: summaryOf(part.output) };
      }
      case "output-error":
        return { ...base, status: "error", result: part.errorText };
      case "output-denied":
        return { ...base, status: "error", result: "Not run" };
      default:
        return { ...base, status: "running", result: "Running…" };
    }
  });
}

// Output of the server's renderChart tool. Light structural check only: the
// payload comes from our own API, but a malformed one must not crash React.
const isRenderChartResult = (o: unknown): o is RenderChartResult =>
  typeof o === "object" && o !== null && "ok" in o && typeof o.ok === "boolean";

export function chartsOf(message: UIMessage): {
  charts: { id: string; chart: ChartData }[];
  chartFailed: boolean;
} {
  const results = message.parts
    .filter(isToolUIPart)
    .filter((p) => getToolName(p) === "renderChart" && p.state === "output-available")
    .flatMap((p) => (isRenderChartResult(p.output) ? [{ id: p.toolCallId, result: p.output }] : []));

  const charts = results.flatMap(({ id, result }) => (result.ok ? [{ id, chart: result.chart }] : []));
  const chartFailed = charts.length === 0 && results.some(({ result }) => !result.ok && result.gaveUp);
  return { charts, chartFailed };
}
