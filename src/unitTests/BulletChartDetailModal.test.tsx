import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BulletChartDetailModal from "../components/KPISection/BulletChartDetailModal";
import type { KPIViewModel } from "../components/KPISection/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseKpi: KPIViewModel = {
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
  explanation: "Pasture access measures how many hours cows spend outdoors.",
  directionality: "higher-is-better",
};

const mockOnClose = vi.fn();
const mockOnPlanValueChange = vi.fn();

const renderModal = (kpi: KPIViewModel = baseKpi) =>
  render(
    <BulletChartDetailModal
      kpi={kpi}
      onClose={mockOnClose}
      onPlanValueChange={mockOnPlanValueChange}
    />,
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BulletChartDetailModal", () => {
  describe("rendering", () => {
    it("renders the KPI name in the header", () => {
      renderModal();
      expect(screen.getByText("Pasture Access")).toBeInTheDocument();
    });

    it("renders the current value", () => {
      renderModal();
      expect(screen.getByText("2,000")).toBeInTheDocument();
    });

    it("renders the tier badge", () => {
      renderModal();
      // The tier badge is a <span> — use getAllByText and check one exists
      const goldElements = screen.getAllByText("Gold");
      expect(goldElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders the plan value when set", () => {
      renderModal();
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });

    it("renders dash when plan value is null", () => {
      renderModal({ ...baseKpi, planValue: null });
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("renders the explanation text", () => {
      renderModal();
      expect(
        screen.getByText(
          "Pasture access measures how many hours cows spend outdoors.",
        ),
      ).toBeInTheDocument();
    });

    it("renders 5 performance score rows", () => {
      renderModal();
      // Each tier appears at least once in the score table
      expect(screen.getByText("Aspirant")).toBeInTheDocument();
      expect(screen.getByText("Bronze")).toBeInTheDocument();
      expect(screen.getByText("Silver")).toBeInTheDocument();
      // Gold appears twice (badge + row) — use getAllByText
      expect(screen.getAllByText("Gold").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Platinum")).toBeInTheDocument();
    });

    it("renders the edit button when not editing", () => {
      renderModal();
      expect(
        screen.getByRole("button", { name: "Edit plan value" }),
      ).toBeInTheDocument();
    });

    it("renders the footer close button", () => {
      renderModal();
      // Use getByText to target the footer button specifically
      expect(screen.getByText("Close")).toBeInTheDocument();
    });

    it("renders the × close button in header", () => {
      renderModal();
      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });
  });

  describe("editing", () => {
    it("shows input when edit button is clicked", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      expect(screen.getByPlaceholderText("Enter value")).toBeInTheDocument();
    });

    it("hides edit button while editing", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      expect(
        screen.queryByRole("button", { name: "Edit plan value" }),
      ).not.toBeInTheDocument();
    });

    it("seeds input with current plan value when editing starts", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      const input = screen.getByPlaceholderText(
        "Enter value",
      ) as HTMLInputElement;
      expect(input.value).toBe("1500");
    });

    it("calls onPlanValueChange with correct value when saved", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      const input = screen.getByPlaceholderText("Enter value");
      fireEvent.change(input, { target: { value: "2000" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(mockOnPlanValueChange).toHaveBeenCalledWith(2000);
    });

    it("calls onPlanValueChange with null when input is cleared", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      const input = screen.getByPlaceholderText("Enter value");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(mockOnPlanValueChange).toHaveBeenCalledWith(null);
    });

    it("hides input when cancel is clicked", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(
        screen.queryByPlaceholderText("Enter value"),
      ).not.toBeInTheDocument();
    });

    it("saves on Enter key press", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      const input = screen.getByPlaceholderText("Enter value");
      fireEvent.change(input, { target: { value: "3000" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(mockOnPlanValueChange).toHaveBeenCalledWith(3000);
    });

    it("cancels on Escape key press", () => {
      renderModal();
      fireEvent.click(screen.getByRole("button", { name: "Edit plan value" }));
      const input = screen.getByPlaceholderText("Enter value");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(
        screen.queryByPlaceholderText("Enter value"),
      ).not.toBeInTheDocument();
    });
  });

  describe("closing", () => {
    it("calls onClose when footer close button is clicked", () => {
      renderModal();
      fireEvent.click(screen.getByText("Close"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when × button is clicked", () => {
      renderModal();
      fireEvent.click(screen.getByLabelText("Close"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when overlay is clicked", () => {
      renderModal();
      const overlay = screen.getByRole("dialog");
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
