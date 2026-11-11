import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describeError, toWireMessages } from "../components/AskKpis/wire";
import { chartsOf, toToolSteps } from "../components/AskKpis/toolSteps";
import ShowTheWork from "../components/AskKpis/ShowTheWork";
import AnswerChart from "../components/AskKpis/charts/AnswerChart";
import { monthLabel } from "../components/AskKpis/charts/monthLabel";
import type { ChartData, RenderChartResult } from "../components/AskKpis/chartSchema";
import { mockKpis } from "../components/KPISection/data/mockKpis";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const text = (role: UIMessage["role"], t: string, id = crypto.randomUUID()): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text: t }],
});

const toolPart = (
  name: string,
  input: unknown,
  output: unknown,
  state: "output-available" | "input-available" = "output-available",
): UIMessage["parts"][number] =>
  state === "output-available"
    ? { type: `tool-${name}`, toolCallId: crypto.randomUUID(), state, input, output }
    : { type: `tool-${name}`, toolCallId: crypto.randomUUID(), state, input };

const assistant = (...parts: UIMessage["parts"]): UIMessage => ({
  id: crypto.randomUUID(),
  role: "assistant",
  parts,
});

const barChart: ChartData = {
  type: "bar",
  title: "Change last month",
  periodA: "2026-09",
  periodB: "2026-10",
  bars: [
    { id: "kpi-6", name: "Species-Rich Grassland", changePct: -18.58, verdict: "worsened" },
    { id: "kpi-4", name: "Nitrogen Soil Surplus", changePct: -3.39, verdict: "improved" },
  ],
};

const failed = (gaveUp: boolean): RenderChartResult => ({
  ok: false,
  summary: "Chart invalid",
  attempt: gaveUp ? 3 : 1,
  attemptsLeft: gaveUp ? 0 : 2,
  gaveUp,
  errors: ["type: Invalid discriminator value"],
});

// ─── wire.ts ─────────────────────────────────────────────────────────────────

describe("toWireMessages", () => {
  it("sends plain text only, dropping tool parts and empty messages", () => {
    const msgs = [
      text("user", "Which metric dropped most?"),
      assistant(toolPart("listMetrics", {}, { summary: "7 metrics" }), { type: "text", text: "Grassland." }),
      assistant(toolPart("listMetrics", {}, { summary: "x" })),
    ];
    expect(toWireMessages(msgs)).toEqual([
      { role: "user", text: "Which metric dropped most?" },
      { role: "assistant", text: "Grassland." },
    ]);
  });

  it("keeps only the last 10 messages and trims over-long questions", () => {
    const msgs = Array.from({ length: 12 }, (_, i) => text("user", `q${i}`));
    msgs.push(text("user", "x".repeat(600)));
    const wire = toWireMessages(msgs);
    expect(wire).toHaveLength(10);
    expect(wire[0].text).toBe("q3");
    expect(wire[9].text).toHaveLength(500);
  });
});

describe("describeError", () => {
  it("shows the server's short plain-text message", () => {
    expect(describeError(new Error("Too many questions. Please wait 42 s and try again."))).toBe(
      "Too many questions. Please wait 42 s and try again.",
    );
  });

  it("hides HTML error pages, long bodies and network errors", () => {
    const generic = "The assistant is unavailable right now. Please try again later.";
    expect(describeError(new Error("<!doctype html><html>404</html>"))).toBe(generic);
    expect(describeError(new Error("x".repeat(300)))).toBe(generic);
    expect(describeError(new TypeError("Failed to fetch"))).toBe(generic);
  });
});

// ─── toolSteps.ts ────────────────────────────────────────────────────────────

describe("toToolSteps", () => {
  it("maps each tool call to name, input, status and summary", () => {
    const steps = toToolSteps(
      assistant(
        toolPart("comparePeriods", { periodA: { from: "2026-09" } }, { summary: "7 metrics: 2026-09 vs 2026-10" }),
        toolPart("queryMetric", { metric: "kpi-5" }, undefined, "input-available"),
      ),
    );
    expect(steps.map(({ name, status, result }) => ({ name, status, result }))).toEqual([
      { name: "comparePeriods", status: "done", result: "7 metrics: 2026-09 vs 2026-10" },
      { name: "queryMetric", status: "running", result: "Running…" },
    ]);
  });

  it("marks a tool that reports ok:false as an error and parses its JSON spec", () => {
    const [step] = toToolSteps(assistant(toolPart("renderChart", { spec: '{"type":"pie"}' }, failed(false))));
    expect(step.status).toBe("error");
    expect(step.input).toEqual({ spec: { type: "pie" } });
  });

  it("shows an unparseable spec exactly as the model sent it", () => {
    const [step] = toToolSteps(assistant(toolPart("renderChart", { spec: "{oops" }, failed(false))));
    expect(step.input).toEqual({ spec: "{oops" });
  });
});

describe("chartsOf", () => {
  it("collects successful charts", () => {
    const msg = assistant(toolPart("renderChart", {}, { ok: true, summary: "Drew", chart: barChart }));
    const { charts, chartFailed } = chartsOf(msg);
    expect(charts.map((c) => c.chart)).toEqual([barChart]);
    expect(charts[0].id).toEqual(expect.any(String)); // stable React key
    expect(chartFailed).toBe(false);
  });

  it("flags a failure only when the model gave up without any chart", () => {
    expect(chartsOf(assistant(toolPart("renderChart", {}, failed(false)))).chartFailed).toBe(false);
    expect(chartsOf(assistant(toolPart("renderChart", {}, failed(true)))).chartFailed).toBe(true);
  });

  it("ignores malformed outputs instead of crashing", () => {
    expect(chartsOf(assistant(toolPart("renderChart", {}, "garbage")))).toEqual({ charts: [], chartFailed: false });
  });
});

// ─── Components ──────────────────────────────────────────────────────────────

describe("ShowTheWork", () => {
  it("renders nothing without tool calls", () => {
    const { container } = render(<ShowTheWork steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every tool call with its input and result", () => {
    render(
      <ShowTheWork
        steps={[
          { id: "1", name: "listMetrics", input: { tier: "Gold" }, status: "done", result: "4 metrics" },
          { id: "2", name: "renderChart", input: {}, status: "error", result: "Chart invalid" },
        ]}
      />,
    );
    expect(screen.getByText("Show the work (2 tool calls)")).toBeInTheDocument();
    expect(screen.getByLabelText("listMetrics input")).toHaveTextContent('{"tier":"Gold"}');
    expect(screen.getByText(/4 metrics/)).toBeInTheDocument();
    expect(screen.getByText(/Error: Chart invalid/)).toBeInTheDocument();
  });
});

describe("AnswerChart", () => {
  it("bar: labels every bar with its change and verdict, not colour alone", () => {
    render(<AnswerChart chart={barChart} />);
    expect(screen.getByText("Change last month")).toBeInTheDocument();
    const bars = within(screen.getByRole("list", { name: "Change from 2026-09 to 2026-10" }));
    const rows = bars.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Species-Rich Grassland−18.6 % worsened");
    expect(rows[1]).toHaveTextContent("Nitrogen Soil Surplus−3.4 % improved");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("line: describes every point for screen readers", () => {
    render(
      <AnswerChart
        chart={{
          type: "line",
          title: "Ammonia",
          name: "Ammonia Emissions",
          unit: "kg NH3/ha",
          plan: 50,
          points: [
            { month: "2026-09", value: 51.1 },
            { month: "2026-10", value: 50.9 },
          ],
        }}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Line chart of Ammonia Emissions in kg NH3/ha, 2026-09 to 2026-10: Sep 26 51.1, Oct 26 50.9. Plan 50.",
    );
  });

  it("bullet: reuses the dashboard's read-only bullet chart rows", () => {
    render(<AnswerChart chart={{ type: "bullet", title: "Now", kpis: mockKpis.slice(0, 2) }} />);
    const rows = screen.getAllByTestId("kpi-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBeDisabled();
  });
});

describe("monthLabel", () => {
  it("formats YYYY-MM as a short month and year", () => {
    expect(monthLabel("2025-11")).toBe("Nov 25");
    expect(monthLabel("2026-01")).toBe("Jan 26");
  });
});
