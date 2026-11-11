import { PostgrestClient } from "@supabase/postgrest-js";
import {
  parseHistoryRows,
  parseKpiRows,
} from "../../src/components/KPISection/mappers.js";
import { mockKpis } from "../../src/components/KPISection/data/mockKpis.js";
import { mockHistory } from "../../src/components/KPISection/data/mockHistory.js";
import type {
  KPIViewModel,
  KpiHistoryPoint,
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

  // Each table falls back on its own: a project that hasn't created
  // kpi_history yet still answers with its real KPIs and plan targets.
  // Rows are validated, not cast: a malformed table counts as unavailable.
  const parsedKpis = kpis.error ? null : parseKpiRows(kpis.data);
  const parsedHistory = history.error ? null : parseHistoryRows(history.data);
  if (!parsedKpis || !parsedHistory) {
    console.warn(
      `[api/ask] Supabase ${[
        !parsedKpis && "kpis",
        !parsedHistory && "kpi_history",
      ]
        .filter(Boolean)
        .join(
          " and ",
        )} unavailable or invalid; using mock data for it (see supabase/schema.sql)`,
    );
  }

  return {
    kpis: parsedKpis ?? mockKpis,
    history: parsedHistory ?? mockHistory,
  };
}
