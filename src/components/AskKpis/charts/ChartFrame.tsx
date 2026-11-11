import type { ReactNode } from "react";
import styled from "styled-components";

type Props = {
  title: string;
  children: ReactNode;
  // Every chart also offers its numbers as a table (screen readers, copying).
  table?: { head: string[]; rows: string[][] };
};

const StyledFigure = styled.figure`
  margin: 0.75rem 0 0 0;
  padding: 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  white-space: normal;
`;

const StyledCaption = styled.figcaption`
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
`;

const StyledDetails = styled.details`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);

  summary {
    cursor: pointer;
    border-radius: var(--radius-sm);
  }

  summary:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  table {
    margin-top: 0.375rem;
    border-collapse: collapse;
    color: var(--color-text-primary);
  }

  th,
  td {
    padding: 0.125rem 0.75rem 0.125rem 0;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
`;

const ChartFrame = ({ title, children, table }: Props) => (
  <StyledFigure data-testid="answer-chart">
    <StyledCaption>{title}</StyledCaption>
    {children}
    {table && (
      <StyledDetails>
        <summary>Data table</summary>
        <table>
          <thead>
            <tr>
              {table.head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </StyledDetails>
    )}
  </StyledFigure>
);

ChartFrame.displayName = "ChartFrame";
export default ChartFrame;
