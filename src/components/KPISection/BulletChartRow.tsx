import { useMemo } from "react";
import styled from "styled-components";
import type { KPIViewModel } from "./types";
import type { BulletChartDirectionality } from "./types";

import {
  buildBulletChartRanges,
  getPositionInFixedTierSystem,
} from "./bulletChartRangeUtils";
import BulletChartMarker from "./BulletChartMarker";

type Props = {
  kpi: KPIViewModel;
  onClick?: () => void;
};

// ─── Styled Components ───────────────────────────────────────────────────────

const StyledRowButton = styled.button<{ $clickable: boolean }>`
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.5rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: ${(p) => (p.$clickable ? "pointer" : "default")};

  &:hover {
    background: ${(p) =>
      p.$clickable ? "var(--color-hover-bg)" : "transparent"};
  }
`;

const StyledNameCol = styled.div`
  width: 16.25rem;
  flex-shrink: 0;
`;

const StyledKpiName = styled.div`
  font-size: 0.875rem;
  line-height: 1.125rem;
  font-weight: 500;
  color: var(--color-text-primary);
`;

const StyledDirectionLabel = styled.div<{
  $direction: BulletChartDirectionality;
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: ${(p) =>
    p.$direction === "higher-is-better"
      ? "var(--color-positive)"
      : "var(--color-negative)"};
`;

const StyledDirectionLabelText = styled.span`
  color: var(--color-muted-2);
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
`;

const StyledChartCol = styled.div`
  flex: 1 1 auto;
  min-width: 13.75rem;
`;

const StyledChartArea = styled.div`
  position: relative;
`;

const StyledChartUnit = styled.div`
  position: absolute;
  right: 100%;
  margin-right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  max-width: 15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
  unicode-bidi: plaintext;
  text-align: right;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1rem;
  color: var(--color-text-secondary);
`;

const StyledChartBar = styled.div`
  height: 2rem;
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  border: 2px solid var(--tier-silver);
  box-shadow: var(--shadow-xs);
`;

const StyledSeg = styled.div<{ $tier: string }>`
  flex: 0 0 auto;
  width: 20%;
  border-right: 1px solid var(--color-bg-card);
  background: ${(p) => {
    const colors: Record<string, string> = {
      minimum: "var(--color-border)",
      bronze: "var(--tier-bronze)",
      silver: "var(--tier-silver)",
      gold: "var(--tier-gold)",
      platinum: "var(--tier-platinum)",
    };
    return colors[p.$tier] ?? "var(--color-border)";
  }};

  &:last-child {
    border-right: 0;
  }
`;

const StyledProgress = styled.div`
  position: absolute;
  top: 50%;
  left: 0;
  height: 0.5rem;
  transform: translateY(-50%);
  background: var(--color-text-primary);
  border-radius: 999px;
  opacity: 0.9;
`;

const StyledNeedle = styled.div`
  position: absolute;
  top: -0.25rem;
  bottom: -0.25rem;
  width: 0.125rem;
  margin-left: -0.0625rem;

  &::before {
    content: "";
    display: block;
    width: 0.125rem;
    height: 100%;
    background: var(--color-text-primary);
    box-shadow: var(--shadow-needle);
  }
`;

const StyledValueCol = styled.div`
  width: 8.75rem;
  flex-shrink: 0;
`;

const StyledValueText = styled.div`
  font-size: 0.875rem;
  line-height: 1.125rem;
  color: var(--color-text-primary);
  font-weight: 600;
`;

const StyledGoalText = styled.div`
  margin-top: 0.1875rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--color-text-secondary);
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatValue = (val: number): string =>
  val.toLocaleString("en-US", {
    minimumFractionDigits: val % 1 === 0 ? 0 : 1,
    maximumFractionDigits: val % 1 === 0 ? 0 : 1,
  });

// ─── Component ───────────────────────────────────────────────────────────────

const BulletChartRow = ({ kpi, onClick }: Props) => {
  const { directionality, segments } = useMemo(
    () => buildBulletChartRanges(kpi),
    [kpi],
  );

  const valuePos = getPositionInFixedTierSystem(
    kpi.value,
    segments,
    directionality,
  );
  const planPos =
    kpi.planValue == null
      ? null
      : getPositionInFixedTierSystem(kpi.planValue, segments, directionality);

  const isHigher = directionality === "higher-is-better";

  return (
    <StyledRowButton
      type="button"
      onClick={onClick}
      disabled={!onClick}
      $clickable={Boolean(onClick)}
      data-testid="kpi-row"
    >
      <StyledNameCol>
        <StyledKpiName>{kpi.name}</StyledKpiName>
        <StyledDirectionLabel $direction={directionality}>
          {isHigher ? "↑" : "↓"}{" "}
          <StyledDirectionLabelText>
            {isHigher ? "HIGHER IS BETTER" : "LOWER IS BETTER"}
          </StyledDirectionLabelText>
        </StyledDirectionLabel>
      </StyledNameCol>

      <StyledChartCol>
        <StyledChartArea>
          {kpi.unit && (
            <StyledChartUnit title={kpi.unit}>({kpi.unit})</StyledChartUnit>
          )}
          <StyledChartBar>
            {segments.map((s) => (
              <StyledSeg
                key={s.key}
                $tier={s.colorKey}
                data-testid="chart-segment"
              />
            ))}
          </StyledChartBar>
          <StyledProgress style={{ width: `${valuePos}%` }} />
          <StyledNeedle style={{ left: `${valuePos}%` }} />
          {planPos != null && (
            <BulletChartMarker style={{ left: `${planPos}%` }} />
          )}
        </StyledChartArea>
      </StyledChartCol>

      <StyledValueCol>
        <StyledValueText>
          {formatValue(kpi.value)} {kpi.unit}
        </StyledValueText>
        <StyledGoalText>
          Goal:{" "}
          {kpi.planValue == null
            ? "-"
            : `${formatValue(kpi.planValue)} ${kpi.unit}`}
        </StyledGoalText>
      </StyledValueCol>
    </StyledRowButton>
  );
};

export default BulletChartRow;
