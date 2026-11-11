import styled from "styled-components";
import type { ToolStep } from "./toolSteps";

type Props = {
  steps: ToolStep[];
};

// ─── Styled Components ───────────────────────────────────────────────────────

const StyledDetails = styled.details`
  margin-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
  white-space: normal;
`;

const StyledSummary = styled.summary`
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
`;

const StyledSteps = styled.ol`
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-primary);
`;

const StyledToolName = styled.code`
  font-weight: 600;
`;

const StyledInput = styled.pre`
  margin: 0.25rem 0;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const StyledResult = styled.div<{ $status: ToolStep["status"] }>`
  color: ${(p) =>
    p.$status === "error"
      ? "var(--color-negative)"
      : "var(--color-text-secondary)"};
`;

// ─── Component ───────────────────────────────────────────────────────────────

const ShowTheWork = ({ steps }: Props) => {
  if (steps.length === 0) return null;

  return (
    <StyledDetails data-testid="show-the-work">
      <StyledSummary>
        Show the work ({steps.length} tool call{steps.length === 1 ? "" : "s"})
      </StyledSummary>
      <StyledSteps>
        {steps.map((step) => (
          <li key={step.id}>
            <StyledToolName>{step.name}</StyledToolName>
            <StyledInput aria-label={`${step.name} input`}>
              {JSON.stringify(step.input ?? {})}
            </StyledInput>
            <StyledResult $status={step.status}>
              {step.status === "error" ? "Error: " : "→ "}
              {step.result}
            </StyledResult>
          </li>
        ))}
      </StyledSteps>
    </StyledDetails>
  );
};

ShowTheWork.displayName = "ShowTheWork";
export default ShowTheWork;
