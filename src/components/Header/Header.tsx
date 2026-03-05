import styled from "styled-components";
import Brand from "./Brand";
import SyncStatusIndicator from "./SyncStatusIndicator";

const StyledContainer = styled.header`
  background-color: var(--color-bg-card);
  border-color: var(--color-border);
  border-width: 1px;
  border-style: solid;
  border-radius: var(--radius-lg);
  padding-block: calc(0.25rem * 4);
  padding-inline: calc(0.25rem * 6);
  box-shadow: var(--shadow-sm);
`;

const StyledHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const Header = () => {
  return (
    <StyledContainer>
      <StyledHeader>
        <Brand />
        <SyncStatusIndicator />
      </StyledHeader>
    </StyledContainer>
  );
};

Header.displayName = "App.Header";

export default Header;
