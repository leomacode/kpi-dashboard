import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BulletChartRow from "../components/KPISection/BulletChartRow";
import type { KPIViewModel } from "../components/KPISection/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const higherIsBetter: KPIViewModel = {
  id: "kpi-1",
  name: "Pasture Access",
  unit: "hrs/year",
  value: 2000,
  planValue: 1500,
  min: 0,
  bronze: 720,
  silver: 900,
  gold: 1440,
  platinum: 4000,
  plateauLabel: "Gold",
  explanation: "Test explanation",
  directionality: "higher-is-better",
};

const lowerIsBetter: KPIViewModel = {
  id: "kpi-5",
  name: "Ammonia Emissions",
  unit: "kg NH3/ha",
  value: 50.9,
  planValue: null,
  min: 0,
  bronze: 399,
  silver: 60,
  gold: 45,
  platinum: 0,
  plateauLabel: "Silver",
  explanation: "Test explanation",
  directionality: "lower-is-better",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BulletChartRow", () => {
  describe("rendering", () => {
    it("renders the KPI name", () => {
      render(<BulletChartRow kpi={higherIsBetter} />);
      expect(screen.getByText("Pasture Access")).toBeInTheDocument();
    });

    it("renders the unit", () => {
      render(<BulletChartRow kpi={higherIsBetter} />);
      expect(screen.getByText("(hrs/year)")).toBeInTheDocument();
    });

    it("renders the current value", () => {
      render(<BulletChartRow kpi={higherIsBetter} />);
      expect(screen.getByText("2,000 hrs/year")).toBeInTheDocument();
    });

    it("renders the goal value when planValue is set", () => {
      render(<BulletChartRow kpi={higherIsBetter} />);
      expect(screen.getByText("Goal: 1,500 hrs/year")).toBeInTheDocument();
    });

    it("renders dash for goal when planValue is null", () => {
      render(<BulletChartRow kpi={lowerIsBetter} />);
      expect(screen.getByText("Goal: -")).toBeInTheDocument();
    });

    it("renders 5 segments", () => {
      const { container } = render(<BulletChartRow kpi={higherIsBetter} />);
      const segments = container.querySelectorAll(
        "[data-testid='chart-segment']",
      );
      expect(segments.length).toBe(5);
    });
  });

  describe("directionality label", () => {
    it("shows ↑ and HIGHER IS BETTER for higher-is-better KPI", () => {
      render(<BulletChartRow kpi={higherIsBetter} />);
      expect(screen.getByText("↑")).toBeInTheDocument();
      expect(screen.getByText("HIGHER IS BETTER")).toBeInTheDocument();
    });

    it("shows ↓ and LOWER IS BETTER for lower-is-better KPI", () => {
      render(<BulletChartRow kpi={lowerIsBetter} />);
      expect(screen.getByText("↓")).toBeInTheDocument();
      expect(screen.getByText("LOWER IS BETTER")).toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("calls onClick when clicked", () => {
      const handleClick = vi.fn();
      render(<BulletChartRow kpi={higherIsBetter} onClick={handleClick} />);
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("is disabled when no onClick is provided", () => {
      render(<BulletChartRow kpi={higherIsBetter} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is not disabled when onClick is provided", () => {
      render(<BulletChartRow kpi={higherIsBetter} onClick={() => {}} />);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });
});
