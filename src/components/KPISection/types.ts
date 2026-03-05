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
