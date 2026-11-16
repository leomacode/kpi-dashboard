import type { KPIViewModel, BulletChartDirectionality } from "./types";

// Worst → best. The single source for tier keys, names and order.
export const TIERS = [
  { key: "minimum", label: "Aspirant", description: "" },
  { key: "bronze", label: "Bronze", description: "Basic certification level" },
  { key: "silver", label: "Silver", description: "Advanced level" },
  { key: "gold", label: "Gold", description: "High level" },
  { key: "platinum", label: "Platinum", description: "Top level" },
] as const;

export type Tier = (typeof TIERS)[number];
export type BulletChartSegmentKey = Tier["key"];

export type BulletChartSegment = {
  key: BulletChartSegmentKey;
  label: string;
  description: string;
  from: number;
  to: number;
  modalRange: string;
};

export type BulletChartRanges = {
  domainMin: number;
  domainMax: number;
  directionality: BulletChartDirectionality;
  segments: BulletChartSegment[];
};

// Extra room beyond the open-ended tier so a value there doesn't sit on the
// edge: 25% of the boundary value, at least 1 unit.
const HEADROOM_RATIO = 0.25;
const MIN_HEADROOM = 1;

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

// Values are validated at the boundary (mappers.ts parseKpiRows), so the only
// repair left here is keeping thresholds in tier order: a misordered tier
// collapses to zero width instead of drawing an inverted range.
const normalizeThresholds = (
  kpi: KPIViewModel,
  min: number,
  directionality: BulletChartDirectionality,
): { bronze: number; silver: number; gold: number; platinum: number } => {
  const {
    bronze: bronze0,
    silver: silver0,
    gold: gold0,
    platinum: platinum0,
  } = kpi;

  if (directionality === "higher-is-better") {
    const bronze = Math.max(min, bronze0);
    const silver = Math.max(bronze, silver0);
    const gold = Math.max(silver, gold0);
    const platinum = Math.max(gold, platinum0);
    return { bronze, silver, gold, platinum };
  }

  const bronze = Math.max(min, bronze0);
  const silver = Math.min(bronze, Math.max(min, silver0));
  const gold = Math.min(silver, Math.max(min, gold0));
  const platinum = Math.min(gold, platinum0);
  return { bronze, silver, gold, platinum };
};

/**
 * Maps a KPI value to a visual position (0–100%) on the bullet chart.
 *
 * The chart uses a fixed 5-tier scale where each segment occupies exactly
 * 20% of the bar width, regardless of numeric distance between thresholds.
 * Position is calculated by: (1) finding which tier the value belongs to,
 * (2) calculating how far into that tier it sits, then (3) mapping that
 * onto the correct 20% block.
 *
 * For lower-is-better KPIs, fractionInSegment is inverted so that improvement
 * always moves the needle rightward.
 */

export const getPositionInFixedTierSystem = (
  value: number,
  segments: readonly BulletChartSegment[],
  directionality: BulletChartDirectionality,
): number => {
  const TIER_WIDTH = 20;
  // Prevents the needle from sitting exactly on a segment boundary,
  // making it visually clear which tier the value belongs to
  const EDGE_PAD = 2;

  const segMap = new Map(segments.map((s) => [s.key, s]));
  const bounds = (key: BulletChartSegmentKey) => {
    const seg = segMap.get(key);
    return (
      seg && { lo: Math.min(seg.from, seg.to), hi: Math.max(seg.from, seg.to) }
    );
  };

  // Best → worst so the highest matching tier wins on a shared boundary.
  let matchedKey: BulletChartSegmentKey = "minimum";
  for (const { key } of [...TIERS].reverse()) {
    const b = bounds(key);
    if (b && value >= b.lo && value <= b.hi) {
      matchedKey = key;
      break;
    }
  }

  // Values beyond the drawn domain belong to the open-ended end tiers.
  const plat = bounds("platinum");
  const min = bounds("minimum");
  if (directionality === "lower-is-better") {
    if (plat && value < plat.lo) matchedKey = "platinum";
    else if (min && value > min.hi) matchedKey = "minimum";
  } else {
    if (plat && value > plat.hi) matchedKey = "platinum";
    else if (min && value < min.lo) matchedKey = "minimum";
  }

  const seg = bounds(matchedKey);
  if (!seg) return 0;
  const blockStart = TIERS.findIndex((t) => t.key === matchedKey) * TIER_WIDTH;
  const range = seg.hi - seg.lo;

  let fractionInSegment: number;
  if (range === 0) {
    fractionInSegment = 0.5;
  } else {
    // Invert fraction for lower-is-better: a lower value within the tier
    // should appear further right (closer to Platinum visually)
    const rawFraction = (value - seg.lo) / range;
    fractionInSegment =
      directionality === "lower-is-better" ? 1 - rawFraction : rawFraction;
  }

  const paddedWidth = TIER_WIDTH - 2 * EDGE_PAD;
  return clamp(blockStart + EDGE_PAD + fractionInSegment * paddedWidth, 0, 100);
};

const formatRangeNumber = (n: number): string => {
  if (!Number.isFinite(n)) return "0";
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : String(n);
};

const justBelow = (value: number): number => {
  if (Number.isInteger(value)) return value - 1;
  const str = String(value);
  const decimals = (str.split(".")[1] || "").length;
  return value - Math.pow(10, -decimals);
};

// First integer past a boundary; non-integer boundaries stay as they are.
const justAbove = (value: number): number =>
  Number.isInteger(value) ? value + 1 : value;

const computeDomain = (kpi: KPIViewModel) => {
  const { directionality } = kpi;
  const baseMin = kpi.min;

  let { bronze, silver, gold, platinum } = normalizeThresholds(
    kpi,
    baseMin,
    directionality,
  );

  const valueCandidate = kpi.value;
  const planCandidate = kpi.planValue ?? baseMin;

  let domainMin = baseMin;

  if (directionality === "lower-is-better") {
    domainMin = Math.min(baseMin, valueCandidate, planCandidate, platinum);
    if (domainMin >= platinum) {
      domainMin =
        platinum - Math.max(Math.abs(platinum) * HEADROOM_RATIO, MIN_HEADROOM);
    }
    ({ bronze, silver, gold, platinum } = normalizeThresholds(
      kpi,
      domainMin,
      directionality,
    ));
  }

  const openEndedStart =
    directionality === "higher-is-better" ? platinum : bronze;
  const baseMax = Math.max(
    openEndedStart,
    valueCandidate,
    planCandidate,
    domainMin + 1,
  );
  let domainMax = baseMax;

  if (domainMax <= openEndedStart) {
    domainMax =
      openEndedStart + Math.max(openEndedStart * HEADROOM_RATIO, MIN_HEADROOM);
  }

  if (domainMax <= domainMin) domainMax = domainMin + 1;

  return {
    domainMin,
    domainMax,
    directionality,
    bronze,
    silver,
    gold,
    platinum,
  };
};

export const getTierMetaByValue = (kpi: KPIViewModel): Tier => {
  const { directionality, value } = kpi;
  const thresholds = normalizeThresholds(kpi, kpi.min, directionality);
  const reached = (t: number) =>
    directionality === "higher-is-better" ? value >= t : value <= t;
  // Best → worst: the first threshold reached is the tier.
  return (
    [...TIERS]
      .reverse()
      .find((t) => t.key !== "minimum" && reached(thresholds[t.key])) ??
    TIERS[0]
  );
};

export const buildBulletChartRanges = (
  kpi: KPIViewModel,
): BulletChartRanges => {
  const {
    domainMin,
    domainMax,
    directionality,
    bronze,
    silver,
    gold,
    platinum,
  } = computeDomain(kpi);
  const higher = directionality === "higher-is-better";
  const fmt = formatRangeNumber;
  const last = TIERS.length - 1;

  // Tier boundaries, worst tier's outer edge first.
  const edges = higher
    ? [domainMin, bronze, silver, gold, platinum, domainMax]
    : [domainMax, bronze, silver, gold, platinum, domainMin];

  const segments = TIERS.map((t, i): BulletChartSegment => {
    // Segments always run low → high numerically.
    const [from, to] = higher
      ? [edges[i], edges[i + 1]]
      : [edges[i + 1], edges[i]];

    let modalRange: string;
    if (higher) {
      if (i === 0)
        modalRange =
          domainMin >= bronze
            ? `< ${fmt(bronze)}`
            : `${fmt(domainMin)} - ${fmt(justBelow(bronze))}`;
      else if (i === last) modalRange = `${fmt(platinum)}+`;
      else modalRange = `${fmt(from)} - ${fmt(justBelow(to))}`;
    } else {
      if (i === 0) modalRange = `${fmt(justAbove(bronze))}+`;
      else if (i === last) modalRange = `≤ ${fmt(platinum)}`;
      else modalRange = `${fmt(justAbove(from))} - ${fmt(to)}`;
    }

    return {
      key: t.key,
      label: t.label,
      description:
        i === 0
          ? higher
            ? "Below bronze level"
            : "Above bronze level"
          : t.description,
      from: clamp(from, domainMin, domainMax),
      to: clamp(to, domainMin, domainMax),
      modalRange,
    };
  });

  return { domainMin, domainMax, directionality, segments };
};
