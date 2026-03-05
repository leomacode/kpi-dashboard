import { describe, it, expect } from "vitest";
import {
  buildBulletChartRanges,
  getPositionInFixedTierSystem,
  getTierMetaByValue,
} from "../components/KPISection/bulletChartRangeUtils";
import type { KPIViewModel } from "../components/KPISection/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const higherIsBetter: KPIViewModel = {
  id: "kpi-1",
  name: "Pasture Access",
  unit: "hrs/year",
  value: 2000,
  planValue: 1500,
  min: 0,
  bronze: 720,
  silver: 900,
  gold: 1440,
  platinum: 4000,
  plateauLabel: "Gold",
  explanation: "Test explanation",
  directionality: "higher-is-better",
};

const lowerIsBetter: KPIViewModel = {
  id: "kpi-5",
  name: "Ammonia Emissions",
  unit: "kg NH3/ha",
  value: 50.9,
  planValue: 50,
  min: 0,
  bronze: 399,
  silver: 60,
  gold: 45,
  platinum: 0,
  plateauLabel: "Silver",
  explanation: "Test explanation",
  directionality: "lower-is-better",
};

// ─── getTierMetaByValue ───────────────────────────────────────────────────────

describe("getTierMetaByValue", () => {
  it("returns correct tier for higher-is-better KPI", () => {
    // value=2000, gold=1440, platinum=4000 → Gold tier
    const result = getTierMetaByValue(higherIsBetter);
    expect(result.name).toBe("Gold");
    expect(result.colorKey).toBe("gold");
  });

  it("returns correct tier for lower-is-better KPI", () => {
    // value=50.9, silver=60, gold=45 → Silver tier (50.9 is between 45 and 60)
    const result = getTierMetaByValue(lowerIsBetter);
    expect(result.name).toBe("Silver");
    expect(result.colorKey).toBe("silver");
  });

  it("returns platinum when value exceeds platinum threshold (higher-is-better)", () => {
    const kpi = { ...higherIsBetter, value: 5000 };
    const result = getTierMetaByValue(kpi);
    expect(result.name).toBe("Platinum");
  });

  it("returns minimum when value is below bronze (higher-is-better)", () => {
    const kpi = { ...higherIsBetter, value: 100 };
    const result = getTierMetaByValue(kpi);
    expect(result.name).toBe("Aspirant");
    expect(result.colorKey).toBe("minimum");
  });

  it("returns platinum when value is below platinum threshold (lower-is-better)", () => {
    const kpi = { ...lowerIsBetter, value: 0 };
    const result = getTierMetaByValue(kpi);
    expect(result.name).toBe("Platinum");
  });

  it("returns minimum when value exceeds bronze threshold (lower-is-better)", () => {
    const kpi = { ...lowerIsBetter, value: 500 };
    const result = getTierMetaByValue(kpi);
    expect(result.name).toBe("Aspirant");
  });
});

// ─── buildBulletChartRanges ───────────────────────────────────────────────────

describe("buildBulletChartRanges", () => {
  it("returns 5 segments for higher-is-better KPI", () => {
    const { segments } = buildBulletChartRanges(higherIsBetter);
    expect(segments).toHaveLength(5);
  });

  it("returns segments in correct order for higher-is-better", () => {
    const { segments } = buildBulletChartRanges(higherIsBetter);
    expect(segments[0].key).toBe("minimum");
    expect(segments[1].key).toBe("bronze");
    expect(segments[2].key).toBe("silver");
    expect(segments[3].key).toBe("gold");
    expect(segments[4].key).toBe("platinum");
  });

  it("returns correct directionality", () => {
    const higher = buildBulletChartRanges(higherIsBetter);
    const lower = buildBulletChartRanges(lowerIsBetter);
    expect(higher.directionality).toBe("higher-is-better");
    expect(lower.directionality).toBe("lower-is-better");
  });

  it("all segment widths sum to 100%", () => {
    const { segments } = buildBulletChartRanges(higherIsBetter);
    const total = segments.reduce((sum, s) => sum + s.pctWidth, 0);
    expect(Math.round(total)).toBe(100);
  });

  it("all segment widths sum to 100% for lower-is-better", () => {
    const { segments } = buildBulletChartRanges(lowerIsBetter);
    const total = segments.reduce((sum, s) => sum + s.pctWidth, 0);
    expect(Math.round(total)).toBe(100);
  });

  it("platinum segment is open-ended for higher-is-better", () => {
    const { segments } = buildBulletChartRanges(higherIsBetter);
    const platinum = segments.find((s) => s.key === "platinum");
    expect(platinum?.isOpenEnded).toBe(true);
  });

  it("minimum segment is open-ended for lower-is-better", () => {
    const { segments } = buildBulletChartRanges(lowerIsBetter);
    const minimum = segments.find((s) => s.key === "minimum");
    expect(minimum?.isOpenEnded).toBe(true);
  });

  it("domainMin is less than domainMax", () => {
    const higher = buildBulletChartRanges(higherIsBetter);
    const lower = buildBulletChartRanges(lowerIsBetter);
    expect(higher.domainMin).toBeLessThan(higher.domainMax);
    expect(lower.domainMin).toBeLessThan(lower.domainMax);
  });
});

// ─── getPositionInFixedTierSystem ─────────────────────────────────────────────

describe("getPositionInFixedTierSystem", () => {
  it("returns a value between 0 and 100", () => {
    const { segments, directionality } = buildBulletChartRanges(higherIsBetter);
    const pos = getPositionInFixedTierSystem(2000, segments, directionality);
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(pos).toBeLessThanOrEqual(100);
  });

  it("platinum value is positioned in the rightmost block (higher-is-better)", () => {
    const { segments, directionality } = buildBulletChartRanges(higherIsBetter);
    const pos = getPositionInFixedTierSystem(5000, segments, directionality);
    expect(pos).toBeGreaterThan(80);
  });

  it("below-minimum value is positioned in the leftmost block (higher-is-better)", () => {
    const { segments, directionality } = buildBulletChartRanges(higherIsBetter);
    const pos = getPositionInFixedTierSystem(100, segments, directionality);
    expect(pos).toBeLessThan(20);
  });

  it("platinum value is positioned in the rightmost block (lower-is-better)", () => {
    const { segments, directionality } = buildBulletChartRanges(lowerIsBetter);
    const pos = getPositionInFixedTierSystem(0, segments, directionality);
    expect(pos).toBeGreaterThan(80);
  });

  it("returns same position for same value", () => {
    const { segments, directionality } = buildBulletChartRanges(higherIsBetter);
    const pos1 = getPositionInFixedTierSystem(2000, segments, directionality);
    const pos2 = getPositionInFixedTierSystem(2000, segments, directionality);
    expect(pos1).toBe(pos2);
  });
});
