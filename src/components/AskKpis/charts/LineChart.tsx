import styled from "styled-components";
import { formatValue } from "../../KPISection/format";
import type { LineChartData } from "../chartSchema";
import ChartFrame from "./ChartFrame";
import { monthLabel } from "./monthLabel";

type Props = {
  chart: LineChartData;
};

// Fixed drawing space. The SVG shrinks on narrow screens but never grows past
// its drawing width, so text stays at its design size on wide panels.
const W = 640;
const H = 220;
const PAD = { top: 16, right: 112, bottom: 28, left: 56 };

const StyledSvg = styled.svg`
  display: block;
  width: 100%;
  max-width: ${W}px;
  height: auto;
  overflow: visible;
  font-size: 11px;
`;

const LineChart = ({ chart }: Props) => {
  const { points, plan, unit } = chart;
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const all = plan == null ? values : [...values, plan];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.1;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const ticks = [lo, (lo + hi) / 2, hi];
  const last = points[points.length - 1];
  // Label every month when there are few, otherwise every third.
  const step = points.length <= 6 ? 1 : 3;

  const description =
    `Line chart of ${chart.name} in ${unit}, ${points[0].month} to ${last.month}: ` +
    points.map((p) => `${monthLabel(p.month)} ${formatValue(p.value)}`).join(", ") +
    (plan == null ? "." : `. Plan ${formatValue(plan)}.`);

  return (
    <ChartFrame
      title={chart.title}
      table={{
        head: ["Month", `${chart.name} (${unit})`],
        rows: points.map((p) => [p.month, formatValue(p.value)]),
      }}
    >
      <StyledSvg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fill="var(--color-text-secondary)">
              {formatValue(t)}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % step === 0 || i === points.length - 1 ? (
            <text key={p.month} x={x(i)} y={H - 8} textAnchor="middle" fill="var(--color-text-secondary)">
              {monthLabel(p.month)}
            </text>
          ) : null,
        )}

        {plan != null && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(plan)}
              y2={y(plan)}
              stroke="var(--color-text-secondary)"
              strokeDasharray="4 4"
            />
            <text x={W - PAD.right + 6} y={y(plan)} dy="0.32em" fill="var(--color-text-secondary)">
              Plan {formatValue(plan)}
            </text>
          </g>
        )}

        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
          fill="none"
          stroke="var(--chart-line)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={p.month}>
            {/* Invisible, larger hit target so the tooltip is easy to reach. */}
            <circle cx={x(i)} cy={y(p.value)} r={10} fill="transparent">
              <title>{`${monthLabel(p.month)}: ${formatValue(p.value)} ${unit}`}</title>
            </circle>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={4}
              fill="var(--chart-line)"
              stroke="var(--color-bg-card)"
              strokeWidth={2}
              pointerEvents="none"
            />
          </g>
        ))}

        <text
          x={x(points.length - 1) + 8}
          y={y(last.value)}
          dy="0.32em"
          fontWeight={600}
          fill="var(--color-text-primary)"
        >
          {formatValue(last.value)} {unit}
        </text>
      </StyledSvg>
    </ChartFrame>
  );
};

LineChart.displayName = "LineChart";
export default LineChart;
