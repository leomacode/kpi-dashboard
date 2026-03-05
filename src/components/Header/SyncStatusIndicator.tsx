import styled from "styled-components";

type Props = {
  lastSyncMinutes?: number;
  label?: string;
};

type SyncTone = "ok" | "warn";

const getSyncStatus = (minutes: number): { text: string; tone: SyncTone } => {
  if (minutes < 60) {
    return { text: `${minutes} minutes ago`, tone: "ok" };
  }
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return {
      text: `${hours} ${hours === 1 ? "hour" : "hours"} ago`,
      tone: "ok",
    };
  }
  const days = Math.floor(minutes / 1440);
  return { text: `${days} ${days === 1 ? "day" : "days"} ago`, tone: "warn" };
};

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
  animation: syncPulse 1.5s ease-in-out infinite;

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
`;

const StyledOk = styled(StyledValueRow)`
  color: var(--color-success-dark);
  ${StyledDot} {
    background: var(--color-success);
  }
`;

const StyledWarn = styled(StyledValueRow)`
  color: var(--color-warn);
  ${StyledDot} {
    background: var(--color-warn-bg);
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

const SyncStatusIndicator = ({
  lastSyncMinutes = 15,
  label = "Data synchronized",
}: Props) => {
  const status = getSyncStatus(lastSyncMinutes);
  const ValueRow = status.tone === "ok" ? StyledOk : StyledWarn;

  return (
    <StyledRoot>
      <StyledBlock>
        <StyledLabel>{label}</StyledLabel>
        <ValueRow>
          <StyledDot />
          {status.text}
        </ValueRow>
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

export default SyncStatusIndicator;
