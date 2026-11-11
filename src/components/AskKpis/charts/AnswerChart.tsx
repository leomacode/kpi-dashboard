import styled from "styled-components";
import BulletChartRow from "../../KPISection/BulletChartRow";
import { formatValue } from "../../KPISection/format";
import type { ChartData } from "../chartSchema";
import BarChart from "./BarChart";
import ChartFrame from "./ChartFrame";
import LineChart from "./LineChart";

type Props = {
  chart: ChartData;
};

const StyledBulletRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow-x: auto;
`;

const AnswerChart = ({ chart }: Props) => {
  switch (chart.type) {
    case "line":
      return <LineChart chart={chart} />;
    case "bar":
      return <BarChart chart={chart} />;
    case "bullet":
      // Reuses the dashboard's own bullet chart rows (read-only: no onClick).
      return (
        <ChartFrame
          title={chart.title}
          table={{
            head: ["Metric", "Value", "Plan", "Tier"],
            rows: chart.kpis.map((k) => [
              k.name,
              `${formatValue(k.value)} ${k.unit}`,
              k.planValue == null ? "-" : `${formatValue(k.planValue)} ${k.unit}`,
              k.plateauLabel,
            ]),
          }}
        >
          <StyledBulletRows>
            {chart.kpis.map((k) => (
              <BulletChartRow key={k.id} kpi={k} />
            ))}
          </StyledBulletRows>
        </ChartFrame>
      );
  }
};

AnswerChart.displayName = "AnswerChart";
export default AnswerChart;
