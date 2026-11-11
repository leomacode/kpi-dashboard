import type {
  KPIViewModel,
  KpiHistoryPoint,
  SupabaseKpi,
  SupabaseKpiHistory,
} from "./types";

export const mapToViewModel = (row: SupabaseKpi): KPIViewModel => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  value: row.value,
  planValue: row.plan_value,
  min: row.min,
  bronze: row.bronze,
  silver: row.silver,
  gold: row.gold,
  platinum: row.platinum,
  plateauLabel: row.plateau_label,
  explanation: row.explanation,
  directionality: row.directionality,
});

// ─── Validation at the boundary ──────────────────────────────────────────────
// Supabase responses are untyped JSON. They are checked once here, so the
// chart code can trust KPIViewModel instead of guessing at bad values.

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === "string";

const STRING_FIELDS = ["id", "name", "unit", "plateau_label", "explanation"];
const NUMBER_FIELDS = ["value", "min", "bronze", "silver", "gold", "platinum"];

export function isSupabaseKpi(row: unknown): row is SupabaseKpi {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    STRING_FIELDS.every((k) => isString(r[k])) &&
    NUMBER_FIELDS.every((k) => isNumber(r[k])) &&
    (r.plan_value === null || isNumber(r.plan_value)) &&
    (r.directionality === "higher-is-better" ||
      r.directionality === "lower-is-better")
  );
}

const isSupabaseKpiHistory = (row: unknown): row is SupabaseKpiHistory => {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    isString(r.kpi_id) &&
    isString(r.month) &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) &&
    isNumber(r.value)
  );
};

// All or nothing: one malformed row means the table can't be trusted, and the
// caller falls back to the bundled sample data rather than drawing a chart
// from partly repaired values. Empty or non-array input also returns null.
export function parseKpiRows(rows: unknown): KPIViewModel[] | null {
  return Array.isArray(rows) && rows.length > 0 && rows.every(isSupabaseKpi)
    ? rows.map(mapToViewModel)
    : null;
}

export function parseHistoryRows(rows: unknown): KpiHistoryPoint[] | null {
  return Array.isArray(rows) &&
    rows.length > 0 &&
    rows.every(isSupabaseKpiHistory)
    ? rows.map((r) => ({ kpiId: r.kpi_id, month: r.month, value: r.value }))
    : null;
}
