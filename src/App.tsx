import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import styled from "styled-components";
import Header from "./components/Header/Header";
import FarmBar from "./components/FarmBar/FarmBar";
import NavigationTabs from "./components/Tabs/Tabs";
import KPISection from "./components/KPISection/KPISection";
import ErrorBoundary from "./components/ErrorBoundary";

const TABS = [
  { key: "kpis", label: "KPIs", href: "/kpis" },
  { key: "farm", label: "Farm Info", href: "/farm" },
];

export default function App() {
  return (
    <BrowserRouter>
      <Wrapper>
        <Header />
        <Main>
          <FarmBar />
          <NavigationTabs items={TABS} />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/kpis" />} />
              <Route path="/kpis" element={<KPISection title="Main KPIs" />} />
              <Route path="/farm" element={<div>Farm Info coming soon</div>} />
              <Route path="*" element={<Navigate to="/kpis" />} />
            </Routes>
          </ErrorBoundary>
        </Main>
      </Wrapper>
    </BrowserRouter>
  );
}

const Wrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;
