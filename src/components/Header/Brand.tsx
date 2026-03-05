import styled from "styled-components";
import Logo from "./Logo";

type Props = {
  label?: string;
  overline?: string;
  subtitle?: string;
  logoSrc?: string;
};

const StyledLabel = styled.a`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  text-decoration: none;
  white-space: nowrap;

  &:focus,
  &:hover {
    text-decoration: none;
  }
`;

const StyledLogoWrapper = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;

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
  <StyledLabel href="/">
    <StyledLogoWrapper>
      <Logo />
    </StyledLogoWrapper>

    <StyledTextBlock>
      {overline && <StyledBrandOverline>{overline}</StyledBrandOverline>}
      <StyledBrandTitle>{label}</StyledBrandTitle>
      {subtitle && <StyledBrandSubtitle>{subtitle}</StyledBrandSubtitle>}
    </StyledTextBlock>
  </StyledLabel>
);

export default Brand;
