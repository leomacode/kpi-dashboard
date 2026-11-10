import { getToolName, isToolUIPart, type UIMessage } from "ai";

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

export function toToolSteps(message: UIMessage): ToolStep[] {
  return message.parts.filter(isToolUIPart).map((part) => {
    const base = { id: part.toolCallId, name: getToolName(part), input: part.input };
    switch (part.state) {
      case "output-available":
        return { ...base, status: "done", result: summaryOf(part.output) };
      case "output-error":
        return { ...base, status: "error", result: part.errorText };
      case "output-denied":
        return { ...base, status: "error", result: "Not run" };
      default:
        return { ...base, status: "running", result: "Running…" };
    }
  });
}
