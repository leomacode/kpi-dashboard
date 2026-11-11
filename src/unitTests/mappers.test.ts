import { describe, it, expect } from "vitest";
import {
  mapToViewModel,
  parseHistoryRows,
  parseKpiRows,
} from "../components/KPISection/mappers";
import type { SupabaseKpi } from "../components/KPISection/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseRow: SupabaseKpi = {
  id: "kpi-1",
  name: "Pasture Access",
  unit: "hrs/year",
  value: 2000,
  plan_value: 1500,
  min: 0,
  bronze: 720,
  silver: 900,
  gold: 1440,
  platinum: 4000,
  plateau_label: "Gold",
  explanation: "Test explanation",
  directionality: "higher-is-better",
};

// ─── mapToViewModel ───────────────────────────────────────────────────────────

describe("mapToViewModel", () => {
  it("maps all fields correctly", () => {
    const result = mapToViewModel(baseRow);

    expect(result.id).toBe("kpi-1");
    expect(result.name).toBe("Pasture Access");
    expect(result.unit).toBe("hrs/year");
    expect(result.value).toBe(2000);
    expect(result.planValue).toBe(1500);
    expect(result.min).toBe(0);
    expect(result.bronze).toBe(720);
    expect(result.silver).toBe(900);
    expect(result.gold).toBe(1440);
    expect(result.platinum).toBe(4000);
    expect(result.plateauLabel).toBe("Gold");
    expect(result.explanation).toBe("Test explanation");
    expect(result.directionality).toBe("higher-is-better");
  });

  it("maps plan_value (snake_case) to planValue (camelCase)", () => {
    const result = mapToViewModel(baseRow);
    expect(result.planValue).toBe(1500);
  });

  it("maps plateau_label (snake_case) to plateauLabel (camelCase)", () => {
    const result = mapToViewModel(baseRow);
    expect(result.plateauLabel).toBe("Gold");
  });

  it("handles null plan_value", () => {
    const row = { ...baseRow, plan_value: null };
    const result = mapToViewModel(row);
    expect(result.planValue).toBeNull();
  });

  it("handles lower-is-better directionality", () => {
    const row = { ...baseRow, directionality: "lower-is-better" as const };
    const result = mapToViewModel(row);
    expect(result.directionality).toBe("lower-is-better");
  });

  it("does not add extra fields", () => {
    const result = mapToViewModel(baseRow);
    expect(Object.keys(result)).toHaveLength(13);
  });
});

// ─── parseKpiRows / parseHistoryRows (validation at the boundary) ─────────────

describe("parseKpiRows", () => {
  it("maps valid rows, including a null plan value", () => {
    const rows = [baseRow, { ...baseRow, id: "kpi-2", plan_value: null }];
    expect(parseKpiRows(rows)?.map((k) => k.planValue)).toEqual([1500, null]);
  });

  it.each([
    ["a number sent as a string", { value: "2000" }],
    ["a non-finite number", { bronze: Number.NaN }],
    ["an unknown directionality", { directionality: "lower" }],
    ["a missing field", { name: undefined }],
  ])("rejects the whole table when one row has %s", (_, patch) => {
    expect(parseKpiRows([baseRow, { ...baseRow, ...patch }])).toBeNull();
  });

  it("returns null for empty or non-array input", () => {
    expect(parseKpiRows([])).toBeNull();
    expect(parseKpiRows(null)).toBeNull();
    expect(parseKpiRows({ rows: [baseRow] })).toBeNull();
  });
});

describe("parseHistoryRows", () => {
  const row = { kpi_id: "kpi-1", month: "2026-10", value: 2000 };

  it("maps valid rows", () => {
    expect(parseHistoryRows([row])).toEqual([
      { kpiId: "kpi-1", month: "2026-10", value: 2000 },
    ]);
  });

  it("rejects malformed months and values", () => {
    expect(parseHistoryRows([{ ...row, month: "2026-13" }])).toBeNull();
    expect(parseHistoryRows([{ ...row, month: "Oct 2026" }])).toBeNull();
    expect(parseHistoryRows([{ ...row, value: "2000" }])).toBeNull();
  });
});
