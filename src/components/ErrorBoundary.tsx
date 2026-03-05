import { Component, type ReactNode } from "react";
import styled from "styled-components";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

// ─── Styled Components ───────────────────────────────────────────────────────

const StyledWrapper = styled.div`
  padding: 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid #fecaca;
  background: #fef2f2;
  text-align: center;
`;

const StyledTitle = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 0.5rem;
`;

const StyledMessage = styled.div`
  font-size: 0.875rem;
  color: #991b1b;
`;

const StyledRetryBtn = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: var(--radius-md);
  background: #dc2626;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
  &:hover {
    background: #b91c1c;
  }
`;

// ─── Default Fallback ─────────────────────────────────────────────────────────

const DefaultFallback = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <StyledWrapper>
    <StyledTitle>Something went wrong</StyledTitle>
    <StyledMessage>{message}</StyledMessage>
    <StyledRetryBtn onClick={onRetry}>Try again</StyledRetryBtn>
  </StyledWrapper>
);

// ─── Component ───────────────────────────────────────────────────────────────

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <DefaultFallback
            message={this.state.message}
            onRetry={this.handleRetry}
          />
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
