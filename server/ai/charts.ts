import {
  ChartSpec,
  type ChartData,
  type RenderChartResult,
} from "../../src/components/AskKpis/chartSchema.js";
import type { KpiData } from "./data.js";
import { compareKpi, findKpi, monthsWithData, periodLabel, type Period } from "./metrics.js";

export const MAX_CHART_ATTEMPTS = 3;

type Parsed = { ok: true; spec: ChartSpec } | { ok: false; errors: string[] };

// JSON → shape (Zod) → meaning (ids exist, months have data, ranges ordered).
// Every error is phrased so the model can fix it on the next attempt.
export function parseChartSpec(json: string, data: KpiData): Parsed {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, errors: [`spec is not valid JSON: ${(e as Error).message}`] };
  }

  const shape = ChartSpec.safeParse(raw);
  if (!shape.success) {
    return {
      ok: false,
      errors: shape.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
    };
  }

  const spec = shape.data;
  const ids = new Set(data.kpis.map((k) => k.id));
  const months = monthsWithData(data);
  const first = months[0];
  const last = months[months.length - 1];
  const errors: string[] = [];

  const checkId = (path: string, id: string) => {
    if (!ids.has(id)) {
      errors.push(`${path}: unknown metric id "${id}". Valid ids: ${[...ids].join(", ")}`);
    }
  };
  const checkRange = (path: string, from?: string, to?: string) => {
    for (const [key, m] of [["from", from], ["to", to]] as const) {
      if (m && (m < first || m > last)) {
        errors.push(`${path}${key}: ${m} has no data; data covers ${first} to ${last}`);
      }
    }
    if (from && to && from > to) errors.push(`${path}from: ${from} is after to: ${to}`);
  };

  switch (spec.type) {
    case "bullet":
      spec.metricIds.forEach((id, i) => checkId(`metricIds.${i}`, id));
      break;
    case "line":
      checkId("metricId", spec.metricId);
      checkRange("", spec.from, spec.to);
      break;
    case "bar":
      spec.metricIds?.forEach((id, i) => checkId(`metricIds.${i}`, id));
      checkRange("periodA.", spec.periodA.from, spec.periodA.to);
      checkRange("periodB.", spec.periodB.from, spec.periodB.to);
      break;
  }

  return errors.length ? { ok: false, errors } : { ok: true, spec };
}

// Fill a validated spec with real numbers. Only called after parseChartSpec,
// so every id and month is known to exist.
export function resolveChart(spec: ChartSpec, data: KpiData): ChartData {
  const kpi = (id: string) => findKpi(data.kpis, id)!;

  switch (spec.type) {
    case "bullet":
      return {
        type: "bullet",
        title: spec.title,
        // The explanation text isn't drawn; don't ship it.
        kpis: spec.metricIds.map((id) => ({ ...kpi(id), explanation: "" })),
      };
    case "line": {
      const k = kpi(spec.metricId);
      return {
        type: "line",
        title: spec.title,
        name: k.name,
        unit: k.unit,
        plan: k.planValue,
        points: data.history
          .filter(
            (p) =>
              p.kpiId === k.id &&
              (!spec.from || p.month >= spec.from) &&
              (!spec.to || p.month <= spec.to),
          )
          .map(({ month, value }) => ({ month, value })),
      };
    }
    case "bar": {
      const kpis = spec.metricIds ? spec.metricIds.map(kpi) : data.kpis;
      const a: Period = spec.periodA;
      const b: Period = spec.periodB;
      return {
        type: "bar",
        title: spec.title,
        periodA: periodLabel(a),
        periodB: periodLabel(b),
        bars: kpis.flatMap((k) => {
          const c = compareKpi(data, k, a, b);
          return c && c.changePct !== null
            ? [{ id: c.id, name: c.name, changePct: c.changePct, verdict: c.verdict }]
            : [];
        })
        // Biggest relative drop first, matching comparePeriods.
        .sort((x, y) => x.changePct - y.changePct),
      };
    }
  }
}

// One renderer per request: counts attempts so a model that keeps producing
// invalid specs is stopped after MAX_CHART_ATTEMPTS and told to give up.
export function createChartRenderer(data: KpiData, maxAttempts = MAX_CHART_ATTEMPTS) {
  let attempts = 0;

  return (json: string): RenderChartResult => {
    if (attempts >= maxAttempts) {
      return {
        ok: false,
        summary: `Chart abandoned after ${maxAttempts} invalid attempts`,
        attempt: attempts,
        attemptsLeft: 0,
        gaveUp: true,
        errors: ["No attempts left. Answer without a chart."],
      };
    }
    attempts += 1;

    const parsed = parseChartSpec(json, data);
    if (parsed.ok) {
      attempts = 0; // a later, separate chart in the same answer starts fresh
      const chart = resolveChart(parsed.spec, data);
      return { ok: true, summary: `Drew ${chart.type} chart "${chart.title}"`, chart };
    }

    const gaveUp = attempts >= maxAttempts;
    return {
      ok: false,
      summary: gaveUp
        ? `Chart invalid ${attempts}/${maxAttempts}, giving up: ${parsed.errors[0]}`
        : `Chart invalid (attempt ${attempts}/${maxAttempts}): ${parsed.errors[0]}`,
      attempt: attempts,
      attemptsLeft: maxAttempts - attempts,
      gaveUp,
      errors: parsed.errors,
    };
  };
}
