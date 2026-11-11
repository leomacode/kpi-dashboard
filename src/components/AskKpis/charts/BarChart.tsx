import styled from "styled-components";
import { formatValue } from "../../KPISection/format";
import type { BarChartData } from "../chartSchema";
import ChartFrame from "./ChartFrame";

type Props = {
  chart: BarChartData;
};

type Verdict = BarChartData["bars"][number]["verdict"];

const COLOR: Record<Verdict, string> = {
  improved: "var(--chart-improved)",
  worsened: "var(--chart-worsened)",
  unchanged: "var(--chart-unchanged)",
};

// Diverging bars around a zero line: position shows the direction of change
// (left = value went down), colour + text show whether that is good, because
// for lower-is-better metrics a decrease is an improvement.

const StyledRows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.75rem;
`;

const StyledRow = styled.li`
  display: grid;
  grid-template-columns: minmax(8rem, 12rem) 1fr minmax(7.5rem, auto);
  align-items: center;
  gap: 0.75rem;
`;

const StyledName = styled.span`
  color: var(--color-text-primary);
`;

const StyledTrack = styled.div`
  position: relative;
  height: 1rem;

  /* zero line */
  &::before {
    content: "";
    position: absolute;
    left: 50%;
    top: -0.125rem;
    bottom: -0.125rem;
    width: 1px;
    background: var(--color-text-secondary);
  }
`;

const StyledBar = styled.div<{ $negative: boolean; $verdict: Verdict }>`
  position: absolute;
  top: 0.125rem;
  bottom: 0.125rem;
  ${(p) => (p.$negative ? "right: 50%;" : "left: 50%;")}
  min-width: 2px;
  background: ${(p) => COLOR[p.$verdict]};
  /* 4px rounding on the data end only; flat against the zero line */
  border-radius: ${(p) => (p.$negative ? "4px 0 0 4px" : "0 4px 4px 0")};
`;

const StyledValue = styled.span`
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const StyledVerdict = styled.span`
  color: var(--color-text-secondary);
`;

const StyledLegend = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
`;

const StyledSwatch = styled.span<{ $verdict: Verdict }>`
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  margin-right: 0.375rem;
  border-radius: 2px;
  background: ${(p) => COLOR[p.$verdict]};
`;

const pct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatValue(Math.abs(n))} %`;

const BarChart = ({ chart }: Props) => {
  if (chart.bars.length === 0) return null;
  const maxAbs = Math.max(...chart.bars.map((b) => Math.abs(b.changePct)), 0.01);
  const verdicts = [...new Set(chart.bars.map((b) => b.verdict))];

  return (
    <ChartFrame
      title={chart.title}
      table={{
        head: ["Metric", `Change ${chart.periodA} → ${chart.periodB}`, "Verdict"],
        rows: chart.bars.map((b) => [b.name, pct(b.changePct), b.verdict]),
      }}
    >
      <StyledRows aria-label={`Change from ${chart.periodA} to ${chart.periodB}`}>
        {chart.bars.map((b) => (
          <StyledRow key={b.id} title={`${b.name}: ${pct(b.changePct)} (${b.verdict})`}>
            <StyledName>{b.name}</StyledName>
            <StyledTrack aria-hidden="true">
              <StyledBar
                $negative={b.changePct < 0}
                $verdict={b.verdict}
                style={{ width: `${(Math.abs(b.changePct) / maxAbs) * 50}%` }}
              />
            </StyledTrack>
            <StyledValue>
              {pct(b.changePct)} <StyledVerdict>{b.verdict}</StyledVerdict>
            </StyledValue>
          </StyledRow>
        ))}
      </StyledRows>
      {verdicts.length > 1 && (
        <StyledLegend aria-hidden="true">
          {verdicts.map((v) => (
            <span key={v}>
              <StyledSwatch $verdict={v} />
              {v}
            </span>
          ))}
        </StyledLegend>
      )}
    </ChartFrame>
  );
};

BarChart.displayName = "BarChart";
export default BarChart;
