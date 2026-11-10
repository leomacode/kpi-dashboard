import { PostgrestClient } from "@supabase/postgrest-js";
import { mapToViewModel } from "../../src/components/KPISection/mappers.js";
import { mockKpis } from "../../src/components/KPISection/data/mockKpis.js";
import { mockHistory } from "../../src/components/KPISection/data/mockHistory.js";
import type {
  KPIViewModel,
  KpiHistoryPoint,
  SupabaseKpi,
  SupabaseKpiHistory,
} from "../../src/components/KPISection/types.js";

export type KpiData = {
  kpis: KPIViewModel[];
  history: KpiHistoryPoint[];
};

const MOCK_DATA: KpiData = { kpis: mockKpis, history: mockHistory };

// Same data source and fallback rules as the dashboard (KPISection.tsx):
// Supabase when configured and non-empty, otherwise the bundled mock data.
// The anon key is public by design (it ships in the browser bundle), so the
// server reads the same VITE_-prefixed vars.
export async function loadKpiData(
  env: NodeJS.ProcessEnv = process.env,
): Promise<KpiData> {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return MOCK_DATA;

  const client = new PostgrestClient(
    new URL("rest/v1", url.replace(/\/?$/, "/")).href,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );

  const [kpis, history] = await Promise.all([
    client.from("kpis").select("*").order("id"),
    client.from("kpi_history").select("*").order("month"),
  ]);

  if (kpis.error || history.error || !kpis.data?.length || !history.data?.length) {
    return MOCK_DATA;
  }

  return {
    kpis: (kpis.data as SupabaseKpi[]).map(mapToViewModel),
    history: (history.data as SupabaseKpiHistory[]).map((row) => ({
      kpiId: row.kpi_id,
      month: row.month,
      value: row.value,
    })),
  };
}
