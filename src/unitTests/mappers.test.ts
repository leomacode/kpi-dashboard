import { describe, it, expect } from "vitest";
import { mapToViewModel } from "../components/KPISection/mappers";
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
