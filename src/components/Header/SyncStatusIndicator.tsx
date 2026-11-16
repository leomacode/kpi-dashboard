import styled from "styled-components";

const StyledRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
`;

const StyledBlock = styled.div`
  text-align: right;
`;

const StyledLabel = styled.div`
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 400;
  color: var(--color-muted-2);
  margin-bottom: 0.125rem;
`;

const StyledValueRow = styled.div`
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const StyledDot = styled.span`
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 62.4375rem; /* 9999px (Effectively infinite) */
  display: inline-block;

  @keyframes syncPulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.45;
    }
    100% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    animation: syncPulse 1.5s ease-in-out infinite;
  }
`;

const StyledOk = styled(StyledValueRow)`
  color: var(--color-success-dark);
  ${StyledDot} {
    background: var(--color-success);
  }
`;

const StyledLogging = styled(StyledValueRow)`
  font-size: 0.875rem;
  margin-top: 1rem;
  color: var(--color-black);
  gap: 0.375rem;

  svg {
    margin-right: 0.375rem;
  }
`;

// Static demo values: there is no real sync source yet.
const SyncStatusIndicator = () => {
  return (
    <StyledRoot>
      <StyledBlock>
        <StyledLabel>Data synchronized</StyledLabel>
        <StyledOk>
          <StyledDot />
          15 minutes ago
        </StyledOk>
        <StyledLogging>
          {/* Kept SVG dimensions as numbers as they are coordinate units, not CSS units */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect
              width="32"
              height="32"
              rx="16"
              style={{ fill: "var(--color-border)" }}
            />
            <circle
              cx="16"
              cy="13"
              r="4"
              style={{ fill: "var(--color-text-secondary)" }}
            />
            <path
              d="M8 26c0-4.4 3.6-8 8-8s8 3.6 8 8"
              style={{ fill: "var(--color-text-secondary)" }}
            />
          </svg>
          user@test.com
        </StyledLogging>
      </StyledBlock>
    </StyledRoot>
  );
};

SyncStatusIndicator.displayName = "SyncStatusIndicator";

export default SyncStatusIndicator;
