import styled from "styled-components";
import ThankYouBanner from "./ThankYouBanner";

type Farm = {
  name: string;
  ubn: string;
  address: string;
};

type Props = {
  farm?: Farm;
  showBanner?: boolean;
};

const StyledHeader = styled.div`
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);

  padding: 1rem 1.5rem;
  position: relative;
  color: var(--color-text-primary);
`;

const StyledHeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
`;

const StyledHeading = styled.h1`
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
`;

const StyledMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-mid);
`;

const StyledMetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--color-mid);

  & + & {
    position: relative;
    padding-left: 1.125rem;

    &::before {
      content: "•";
      position: absolute;
      left: 0.375rem;
      color: var(--tier-silver);
    }
  }
`;

const DEFAULT_FARM: Farm = {
  name: "Green Valley Dairy Farm",
  ubn: "482910",
  address: "14 Meadow Lane, Utrecht",
};

const FarmBar = ({ farm = DEFAULT_FARM, showBanner = true }: Props) => (
  <>
    <StyledHeader>
      <StyledHeaderTop>
        <div>
          <StyledHeading>{farm.name}</StyledHeading>
          <StyledMeta>
            <StyledMetaItem>UBN: {farm.ubn}</StyledMetaItem>
            <StyledMetaItem>{farm.address}</StyledMetaItem>
          </StyledMeta>
        </div>
      </StyledHeaderTop>
    </StyledHeader>
    {showBanner && <ThankYouBanner />}
  </>
);

FarmBar.displayName = "FarmBar";

export default FarmBar;
