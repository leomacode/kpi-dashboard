import type { KPIViewModel, SupabaseKpi } from "./types";

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
