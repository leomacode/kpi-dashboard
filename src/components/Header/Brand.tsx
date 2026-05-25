import styled from "styled-components";
import { Link } from "react-router-dom";
import Logo from "./Logo";

type Props = {
  label?: string;
  overline?: string;
  subtitle?: string;
  logoSrc?: string;
};

const StyledRoot = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  white-space: nowrap;
`;

const StyledLogoLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  text-decoration: none;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 4px;
  }

  img {
    height: 3.5rem;
    width: auto;
    display: block;
  }
`;

const StyledTextBlock = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StyledBrandOverline = styled.div`
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--color-brand-accent);
  white-space: nowrap;
`;

const StyledBrandTitle = styled.h1`
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.125rem 0;
  white-space: nowrap;
`;

const StyledBrandSubtitle = styled.div`
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 400;
  color: var(--color-brand-subtle);
  white-space: nowrap;
`;

const Brand = ({
  label = "Sustainability Monitoring",
  overline = "Greendairy.nl",
  subtitle = "Farm Performance Dashboard",
}: Props) => (
  <StyledRoot>
    <StyledLogoLink to="/" aria-label={`${overline} home`}>
      <Logo />
    </StyledLogoLink>

    <StyledTextBlock>
      {overline && <StyledBrandOverline>{overline}</StyledBrandOverline>}
      <StyledBrandTitle>{label}</StyledBrandTitle>
      {subtitle && <StyledBrandSubtitle>{subtitle}</StyledBrandSubtitle>}
    </StyledTextBlock>
  </StyledRoot>
);

Brand.displayName = "Brand";

export default Brand;
