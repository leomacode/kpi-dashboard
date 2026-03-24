import { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import BulletChartRow from "./BulletChartRow";
import BulletChartDetailModal from "./BulletChartDetailModal";
import { supabase } from "../../lib/supabase";
import { mapToViewModel } from "./mappers";
import { mockKpis } from "./data/mockKpis";

import type { KPIViewModel, SupabaseKpi } from "./types";

type Props = {
  title?: string;
};

// ─── Styled Components ───────────────────────────────────────────────────────

const StyledKpiCard = styled.div`
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
`;

const StyledKpiCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StyledKpiTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
`;

const StyledKpiSubtitle = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--color-text-secondary);
`;

const StyledKpiColumnHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.625rem;
`;

const StyledKpiSpacerCol = styled.div`
  width: 16.25rem;
  flex-shrink: 0;
`;

const StyledKpiChartLabels = styled.div`
  flex: 1 1 auto;
  display: flex;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--color-mid);
  font-weight: 600;

  > div {
    flex: 1 1 0%;
    text-align: center;
  }
`;

const StyledKpiValueColHeader = styled.div`
  width: 8.75rem;
  flex-shrink: 0;
`;

const StyledKpiRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const StyledStatus = styled.div`
  padding: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_LABELS = ["Aspirant", "Bronze", "Silver", "Gold", "Platinum"];

// ─── Component ───────────────────────────────────────────────────────────────

const KPISection = ({ title = "Main KPIs" }: Props) => {
  const [kpis, setKpis] = useState<KPIViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);

  // Fetch KPIs from Supabase.
  // If the backend is unavailable, fall back to mock data so the UI
  // remains usable in demo environments.
  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .order("id");

      // Fall back to mock data if Supabase is unavailable or not configured
      if (error || !data || data.length === 0) {
        setKpis(mockKpis);
      } else {
        setKpis((data as SupabaseKpi[]).map(mapToViewModel));
      }

      setLoading(false);
    };

    fetchKpis();
  }, []);

  const selectedKpi =
    selectedKpiId != null
      ? (kpis.find((k) => k.id === selectedKpiId) ?? null)
      : null;

  const handleOpen = useCallback((kpiId: string) => {
    setSelectedKpiId(kpiId);
  }, []);

  const handleClose = useCallback(() => setSelectedKpiId(null), []);

  const handlePlanValueChange = useCallback(
    async (kpiId: string, value: number | null) => {
      // Optimistic update
      setKpis((prev) =>
        prev.map((k) => (k.id === kpiId ? { ...k, planValue: value } : k)),
      );

      // Persist to Supabase
      const { error } = await supabase
        .from("kpis")
        .update({ plan_value: value })
        .eq("id", kpiId);

      if (error) {
        console.error("Failed to update plan value:", error.message);
        // Rollback — refetch from server to restore correct state
        const { data } = await supabase.from("kpis").select("*").order("id");
        if (data) setKpis((data as SupabaseKpi[]).map(mapToViewModel));
      }
    },
    [],
  );

  return (
    <StyledKpiCard>
      <StyledKpiCardHeader>
        <div>
          <StyledKpiTitle>{title}</StyledKpiTitle>
          <StyledKpiSubtitle>
            Click a KPI for details, thresholds and explanation.
          </StyledKpiSubtitle>
        </div>
      </StyledKpiCardHeader>

      {loading && <StyledStatus>Loading KPIs...</StyledStatus>}

      {!loading && (
        <>
          <StyledKpiColumnHeaderRow>
            <StyledKpiSpacerCol />
            <StyledKpiChartLabels>
              {TIER_LABELS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </StyledKpiChartLabels>
            <StyledKpiValueColHeader />
          </StyledKpiColumnHeaderRow>

          <StyledKpiRows>
            {kpis.map((kpi) => (
              <BulletChartRow
                key={kpi.id}
                kpi={kpi}
                onClick={() => handleOpen(kpi.id)}
              />
            ))}
          </StyledKpiRows>
        </>
      )}

      {selectedKpi && (
        <BulletChartDetailModal
          key={`${selectedKpi.id}`}
          kpi={selectedKpi}
          onClose={handleClose}
          onPlanValueChange={(value) =>
            handlePlanValueChange(selectedKpi.id, value)
          }
        />
      )}
    </StyledKpiCard>
  );
};

KPISection.displayName = "KPISection";
export default KPISection;
