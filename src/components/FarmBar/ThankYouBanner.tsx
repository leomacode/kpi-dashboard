import styled from "styled-components";

const OuterCard = styled.div`
  background: var(--color-banner-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
`;

const InnerBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.0625rem 1.5rem;
  border-left: 3px solid var(--color-success);
  border-radius: var(--radius-lg);
`;

const BannerText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-black);
`;

const Bold = styled.span`
  font-weight: 600;
  color: var(--color-text-primary);
`;

const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color-success)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-5" />
  </svg>
);

const ThankYouBanner = () => (
  <OuterCard>
    <InnerBanner>
      <CheckIcon />
      <BannerText>
        <Bold>Thank you for your commitment!</Bold> Your sustainable farming
        practices contribute to a healthier environment and a future-proof farm
        operation.
      </BannerText>
    </InnerBanner>
  </OuterCard>
);

ThankYouBanner.displayName = "ThankYouBanner";

export default ThankYouBanner;
