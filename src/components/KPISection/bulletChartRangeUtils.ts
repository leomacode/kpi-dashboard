import type { KPIViewModel, BulletChartDirectionality } from "./types";

export type BulletChartSegmentKey =
  | "minimum"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum";

export type BulletChartSegment = {
  key: BulletChartSegmentKey;
  label: string;
  description: string;
  colorKey: BulletChartSegmentKey;
  from: number;
  to: number;
  isOpenEnded: boolean;
  modalRange: string;
  pctFrom: number;
  pctWidth: number;
};

export type BulletChartRanges = {
  domainMin: number;
  domainMax: number;
  directionality: BulletChartDirectionality;
  segments: BulletChartSegment[];
};

type Options = {
  min?: number;
  max?: number;
  headroomRatio?: number;
  minHeadroom?: number;
};

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

const toFinite = (v: unknown, fallback: number): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const normalizeDirectionality = (
  raw: unknown,
): BulletChartDirectionality | null => {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "lower-is-better" || s.includes("lager") || s.includes("lower"))
    return "lower-is-better";
  if (s === "higher-is-better" || s.includes("hoger") || s.includes("higher"))
    return "higher-is-better";
  return null;
};

const inferDirectionalityFromThresholds = (
  kpi: KPIViewModel,
  min: number,
): BulletChartDirectionality => {
  const b = toFinite(kpi.bronze, min);
  const s = toFinite(kpi.silver, b);
  const g = toFinite(kpi.gold, s);
  const p = toFinite(kpi.platinum, g);
  const isDescending = b >= s && s >= g && g >= p;
  const hasSlope = b !== s || s !== g || g !== p;
  if (isDescending && hasSlope) return "lower-is-better";
  return "higher-is-better";
};

const getDirectionality = (kpi: KPIViewModel): BulletChartDirectionality => {
  const normalized = normalizeDirectionality(kpi.directionality);
  if (normalized) return normalized;
  return inferDirectionalityFromThresholds(kpi, kpi.min ?? 0);
};

const normalizeThresholds = (
  kpi: KPIViewModel,
  min: number,
  directionality: BulletChartDirectionality,
): { bronze: number; silver: number; gold: number; platinum: number } => {
  const bronze0 = toFinite(kpi.bronze, min);
  const silver0 = toFinite(kpi.silver, bronze0);
  const gold0 = toFinite(kpi.gold, silver0);
  const platinum0 = toFinite(kpi.platinum, gold0);

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

export const getPositionInFixedTierSystem = (
  value: number,
  segments: readonly BulletChartSegment[],
  directionality: BulletChartDirectionality,
): number => {
  const TIER_WIDTH = 20;
  const EDGE_PAD = 2;

  const tierOrder: Record<string, number> = {
    minimum: 0,
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
  };

  const segMap = new Map(segments.map((s) => [s.key, s]));
  const tierKeys: BulletChartSegmentKey[] = [
    "platinum",
    "gold",
    "silver",
    "bronze",
    "minimum",
  ];
  let matchedKey: BulletChartSegmentKey = "minimum";

  for (const key of tierKeys) {
    const seg = segMap.get(key);
    if (!seg) continue;
    const lo = Math.min(seg.from, seg.to);
    const hi = Math.max(seg.from, seg.to);
    const range = hi - lo;
    if (range === 0) {
      if (value === lo) {
        matchedKey = key;
        break;
      }
    } else {
      if (value >= lo && value <= hi) {
        matchedKey = key;
        break;
      }
    }
  }

  if (directionality === "lower-is-better") {
    const platSeg = segMap.get("platinum");
    const minSeg = segMap.get("minimum");
    if (platSeg && value < Math.min(platSeg.from, platSeg.to))
      matchedKey = "platinum";
    else if (minSeg && value > Math.max(minSeg.from, minSeg.to))
      matchedKey = "minimum";
  } else {
    const platSeg = segMap.get("platinum");
    const minSeg = segMap.get("minimum");
    if (platSeg && value > Math.max(platSeg.from, platSeg.to))
      matchedKey = "platinum";
    else if (minSeg && value < Math.min(minSeg.from, minSeg.to))
      matchedKey = "minimum";
  }

  const tierIndex = tierOrder[matchedKey];
  const blockStart = tierIndex * TIER_WIDTH;
  const seg = segMap.get(matchedKey);
  if (!seg) return 0;

  const lo = Math.min(seg.from, seg.to);
  const hi = Math.max(seg.from, seg.to);
  const range = hi - lo;

  let fractionInSegment: number;
  if (range === 0) {
    fractionInSegment = 0.5;
  } else {
    const rawFraction = (value - lo) / range;
    fractionInSegment =
      directionality === "lower-is-better" ? 1 - rawFraction : rawFraction;
  }

  const paddedWidth = TIER_WIDTH - 2 * EDGE_PAD;
  const position = blockStart + EDGE_PAD + fractionInSegment * paddedWidth;
  return Math.max(0, Math.min(100, position));
};

export const valueToPercent = (
  value: number,
  domainMin: number,
  domainMax: number,
  directionality: BulletChartDirectionality = "higher-is-better",
): number => {
  const range = domainMax - domainMin;
  if (range <= 0) return 0;
  const raw = ((value - domainMin) / range) * 100;
  const pct = clamp(raw, 0, 100);
  return directionality === "lower-is-better" ? 100 - pct : pct;
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

const adjustBoundary = (value: number, direction: "up" | "down"): number => {
  if (Number.isInteger(value))
    return direction === "up" ? value + 1 : value - 1;
  return value;
};

const formatClosedRange = (from: number, to: number): string => {
  const lower = Math.min(from, to);
  const higher = Math.max(from, to);
  const adjustedLower = adjustBoundary(lower, "up");
  return `${formatRangeNumber(adjustedLower)} - ${formatRangeNumber(higher)}`;
};

const formatOpenHighRange = (from: number): string => {
  const adjusted = Number.isInteger(from) ? from + 1 : from;
  return `${formatRangeNumber(adjusted)}+`;
};

const computeDomain = (kpi: KPIViewModel, options: Options = {}) => {
  const directionality = getDirectionality(kpi);
  const baseMin = options.min ?? kpi.min ?? 0;

  let { bronze, silver, gold, platinum } = normalizeThresholds(
    kpi,
    baseMin,
    directionality,
  );

  const valueCandidate = toFinite(kpi.value, baseMin);
  const planCandidate =
    kpi.planValue == null ? baseMin : toFinite(kpi.planValue, baseMin);

  let domainMin = baseMin;

  if (directionality === "lower-is-better") {
    domainMin = Math.min(baseMin, valueCandidate, planCandidate, platinum);
    if (domainMin >= platinum) {
      const headroomRatio = options.headroomRatio ?? 0.25;
      const minHeadroom = options.minHeadroom ?? 1;
      const headroom = Math.max(
        Math.abs(platinum) * headroomRatio,
        minHeadroom,
      );
      domainMin = platinum - headroom;
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
  let domainMax = options.max ?? baseMax;

  if (domainMax <= openEndedStart) {
    const headroomRatio = options.headroomRatio ?? 0.25;
    const minHeadroom = options.minHeadroom ?? 1;
    const headroom = Math.max(openEndedStart * headroomRatio, minHeadroom);
    domainMax = openEndedStart + headroom;
  }

  if (domainMax <= domainMin) domainMax = domainMin + 1;

  return {
    baseMin,
    domainMin,
    domainMax,
    directionality,
    bronze,
    silver,
    gold,
    platinum,
  };
};

export const getTierKeyByValue = (kpi: KPIViewModel): BulletChartSegmentKey => {
  const directionality = getDirectionality(kpi);
  const min = kpi.min ?? 0;
  const { bronze, silver, gold, platinum } = normalizeThresholds(
    kpi,
    min,
    directionality,
  );
  const value = toFinite(kpi.value, min);

  if (directionality === "higher-is-better") {
    if (value >= platinum) return "platinum";
    if (value >= gold) return "gold";
    if (value >= silver) return "silver";
    if (value >= bronze) return "bronze";
    return "minimum";
  }

  if (value <= platinum) return "platinum";
  if (value <= gold) return "gold";
  if (value <= silver) return "silver";
  if (value <= bronze) return "bronze";
  return "minimum";
};

export const getTierMetaByValue = (
  kpi: KPIViewModel,
): { name: string; colorKey: BulletChartSegmentKey } => {
  const key = getTierKeyByValue(kpi);
  const nameMap: Record<BulletChartSegmentKey, string> = {
    minimum: "Aspirant",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
  };
  return { name: nameMap[key], colorKey: key };
};

export const buildBulletChartRanges = (
  kpi: KPIViewModel,
  options: Options = {},
): BulletChartRanges => {
  const {
    domainMin,
    domainMax,
    directionality,
    bronze,
    silver,
    gold,
    platinum,
  } = computeDomain(kpi, options);

  const raw =
    directionality === "higher-is-better"
      ? [
          {
            key: "minimum" as BulletChartSegmentKey,
            label: "Aspirant",
            description: "Below bronze level",
            colorKey: "minimum" as BulletChartSegmentKey,
            from: domainMin,
            to: bronze,
            isOpenEnded: false,
            modalRange:
              domainMin >= bronze
                ? `< ${formatRangeNumber(bronze)}`
                : `${formatRangeNumber(domainMin)} - ${formatRangeNumber(justBelow(bronze))}`,
          },
          {
            key: "bronze" as BulletChartSegmentKey,
            label: "Bronze",
            description: "Basic certification level",
            colorKey: "bronze" as BulletChartSegmentKey,
            from: bronze,
            to: silver,
            isOpenEnded: false,
            modalRange: `${formatRangeNumber(bronze)} - ${formatRangeNumber(justBelow(silver))}`,
          },
          {
            key: "silver" as BulletChartSegmentKey,
            label: "Silver",
            description: "Advanced level",
            colorKey: "silver" as BulletChartSegmentKey,
            from: silver,
            to: gold,
            isOpenEnded: false,
            modalRange: `${formatRangeNumber(silver)} - ${formatRangeNumber(justBelow(gold))}`,
          },
          {
            key: "gold" as BulletChartSegmentKey,
            label: "Gold",
            description: "High level",
            colorKey: "gold" as BulletChartSegmentKey,
            from: gold,
            to: platinum,
            isOpenEnded: false,
            modalRange: `${formatRangeNumber(gold)} - ${formatRangeNumber(justBelow(platinum))}`,
          },
          {
            key: "platinum" as BulletChartSegmentKey,
            label: "Platinum",
            description: "Top level",
            colorKey: "platinum" as BulletChartSegmentKey,
            from: platinum,
            to: domainMax,
            isOpenEnded: true,
            modalRange: `${formatRangeNumber(platinum)}+`,
          },
        ]
      : [
          {
            key: "minimum" as BulletChartSegmentKey,
            label: "Aspirant",
            description: "Above bronze level",
            colorKey: "minimum" as BulletChartSegmentKey,
            from: bronze,
            to: domainMax,
            isOpenEnded: true,
            modalRange: formatOpenHighRange(bronze),
          },
          {
            key: "bronze" as BulletChartSegmentKey,
            label: "Bronze",
            description: "Basic certification level",
            colorKey: "bronze" as BulletChartSegmentKey,
            from: silver,
            to: bronze,
            isOpenEnded: false,
            modalRange: formatClosedRange(silver, bronze),
          },
          {
            key: "silver" as BulletChartSegmentKey,
            label: "Silver",
            description: "Advanced level",
            colorKey: "silver" as BulletChartSegmentKey,
            from: gold,
            to: silver,
            isOpenEnded: false,
            modalRange: formatClosedRange(gold, silver),
          },
          {
            key: "gold" as BulletChartSegmentKey,
            label: "Gold",
            description: "High level",
            colorKey: "gold" as BulletChartSegmentKey,
            from: platinum,
            to: gold,
            isOpenEnded: false,
            modalRange: formatClosedRange(platinum, gold),
          },
          {
            key: "platinum" as BulletChartSegmentKey,
            label: "Platinum",
            description: "Top level",
            colorKey: "platinum" as BulletChartSegmentKey,
            from: domainMin,
            to: platinum,
            isOpenEnded: false,
            modalRange: `≤ ${formatRangeNumber(platinum)}`,
          },
        ];

  const segments: BulletChartSegment[] = raw.map((s) => {
    const safeFrom = clamp(s.from, domainMin, domainMax);
    const safeTo = clamp(s.to, domainMin, domainMax);
    const pFrom = valueToPercent(
      safeFrom,
      domainMin,
      domainMax,
      directionality,
    );
    const pTo = valueToPercent(safeTo, domainMin, domainMax, directionality);
    const left = Math.min(pFrom, pTo);
    const width = Math.max(0, Math.abs(pTo - pFrom));

    return {
      key: s.key,
      label: s.label,
      description: s.description,
      colorKey: s.colorKey,
      from: safeFrom,
      to: safeTo,
      isOpenEnded: s.isOpenEnded,
      modalRange: s.modalRange,
      pctFrom: clamp(left, 0, 100),
      pctWidth: clamp(width, 0, 100),
    };
  });

  return { domainMin, domainMax, directionality, segments };
};
