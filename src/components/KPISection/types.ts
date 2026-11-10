export type BulletChartDirectionality = "higher-is-better" | "lower-is-better";

export type KPIViewModel = {
  id: string;
  name: string;
  unit: string;
  value: number;
  planValue: number | null;
  min: number;
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  plateauLabel: string;
  explanation: string;
  directionality: BulletChartDirectionality;
};

export type SupabaseKpi = {
  id: string;
  name: string;
  unit: string;
  value: number;
  plan_value: number | null;
  min: number;
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  plateau_label: string;
  explanation: string;
  directionality: "higher-is-better" | "lower-is-better";
};

// One monthly reading. `month` is "YYYY-MM".
export type KpiHistoryPoint = {
  kpiId: string;
  month: string;
  value: number;
};

export type SupabaseKpiHistory = {
  kpi_id: string;
  month: string;
  value: number;
};
