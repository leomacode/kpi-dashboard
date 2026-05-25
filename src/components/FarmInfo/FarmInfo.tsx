import styled from "styled-components";

const StyledCard = styled.section`
  box-shadow: var(--shadow-sm);
  padding: 3rem 1.5rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const StyledIcon = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  background: var(--color-status-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent-dark);
`;

const StyledTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
`;

const StyledDescription = styled.p`
  margin: 0;
  max-width: 32rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
`;

const StyledList = styled.ul`
  margin: 0.5rem 0 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
`;

const StyledBadge = styled.li`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--tier-minimum-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
`;

const FarmInfo = () => (
  <StyledCard aria-labelledby="farm-info-title">
    <StyledIcon aria-hidden="true">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </StyledIcon>
    <StyledTitle id="farm-info-title">Farm Info — coming soon</StyledTitle>
    <StyledDescription>
      Detailed farm profile is on the way: livestock counts, certifications,
      land use, and historical performance trends.
    </StyledDescription>
    <StyledList>
      <StyledBadge>Livestock</StyledBadge>
      <StyledBadge>Certifications</StyledBadge>
      <StyledBadge>Land use</StyledBadge>
      <StyledBadge>History</StyledBadge>
    </StyledList>
  </StyledCard>
);

FarmInfo.displayName = "FarmInfo";

export default FarmInfo;
