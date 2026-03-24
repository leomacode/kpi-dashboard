import styled, { css } from "styled-components";
import { NavLink } from "react-router-dom";

type TabItem = {
  key: string;
  label: string;
  href: string;
};

type Props = {
  items: TabItem[];
};

// ─── Styled Components ───────────────────────────────────────────────────────

const StyledListWrapper = styled.div`
  border-radius: var(--radius-lg);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
`;

const StyledList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  padding-left: 0;
  margin: 0;
  list-style: none;
  height: 100%;
  overflow: hidden;
`;

const StyledTabItem = styled.li`
  display: flex;
  margin: 0;
`;

const activeStyles = css`
  color: var(--color-tabs-accent);
  background: var(--color-tabs-accent-bg);
  border-bottom-color: var(--color-tabs-accent);
`;

const StyledNavLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-brand-subtle);
  text-decoration: none;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;

  &:hover,
  &:focus {
    color: var(--color-text-primary);
    background: var(--color-hover-bg);
    text-decoration: none;
    outline: none;
  }

  &.active {
    ${activeStyles}
  }
`;

// ─── Components ───────────────────────────────────────────────────────────────

const NavigationItem = ({ item }: { item: TabItem }) => (
  <StyledTabItem>
    <StyledNavLink to={item.href}>{item.label}</StyledNavLink>
  </StyledTabItem>
);

const NavigationTabs = ({ items }: Props) => (
  <StyledListWrapper>
    <StyledList>
      {items.map((item) => (
        <NavigationItem key={item.key} item={item} />
      ))}
    </StyledList>
  </StyledListWrapper>
);

NavigationTabs.displayName = "NavigationTabs";

export default NavigationTabs;
