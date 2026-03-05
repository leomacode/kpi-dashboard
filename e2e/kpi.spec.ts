import { test, expect } from "@playwright/test";

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto("/kpis");
  // Wait for data to load from Supabase
  await page.waitForSelector("[data-testid='kpi-row']");
});

// ─── Page Load ───────────────────────────────────────────────────────────────

test.describe("KPI Dashboard", () => {
  test("loads and displays KPI rows", async ({ page }) => {
    const rows = page.getByTestId("kpi-row");
    await expect(rows).toHaveCount(7);
  });

  test("displays column headers", async ({ page }) => {
    await expect(page.getByText("Aspirant")).toBeVisible();
    await expect(page.getByText("Bronze")).toBeVisible();
    await expect(page.getByText("Silver")).toBeVisible();
    await expect(page.getByText("Gold")).toBeVisible();
    await expect(page.getByText("Platinum")).toBeVisible();
  });

  test("displays KPI names", async ({ page }) => {
    await expect(page.getByText("Pasture Access")).toBeVisible();
    await expect(page.getByText("Bulk Milk Urea")).toBeVisible();
    await expect(page.getByText("Ammonia Emissions")).toBeVisible();
  });

  test("displays directionality labels", async ({ page }) => {
    await expect(page.getByText("HIGHER IS BETTER").first()).toBeVisible();
    await expect(page.getByText("LOWER IS BETTER").first()).toBeVisible();
  });
});

// ─── Modal ───────────────────────────────────────────────────────────────────

test.describe("KPI Modal", () => {
  test("opens modal when row is clicked", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("displays correct KPI name in modal", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Pasture Access", { exact: true }),
    ).toBeVisible();
  });

  test("displays current status and plan value", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Current Status")).toBeVisible();
    await expect(dialog.getByText("Target (Plan)")).toBeVisible();
  });

  test("displays performance score rows", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Performance Score")).toBeVisible();
    await expect(dialog.getByText("Aspirant")).toBeVisible();
    await expect(dialog.getByText("Platinum")).toBeVisible();
  });

  test("closes modal when × button is clicked", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Close").click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("closes modal when Close button is clicked", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByText("Close").click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("closes modal when Escape key is pressed", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("closes modal when overlay is clicked", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Click the overlay (outside the modal)
    await page.mouse.click(10, 10);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

// ─── Plan Value Editing ───────────────────────────────────────────────────────

test.describe("Plan Value Editing", () => {
  test("shows edit button in modal", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await expect(page.getByLabel("Edit plan value")).toBeVisible();
  });

  test("shows input when edit button is clicked", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await page.getByLabel("Edit plan value").click();
    await expect(page.getByPlaceholder("Enter value")).toBeVisible();
  });

  test("saves new plan value and updates goal text in row", async ({
    page,
  }) => {
    await page.getByTestId("kpi-row").first().click();
    await page.getByLabel("Edit plan value").click();

    const input = page.getByPlaceholder("Enter value");
    await input.clear();
    await input.fill("3000");
    await page.getByLabel("Save").click();

    // Modal stays open — check updated value
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("3,000")).toBeVisible();

    // Close modal and verify the row goal text updated
    await page.getByRole("dialog").getByText("Close").click();
    await expect(page.getByText("Goal: 3,000 hrs/year")).toBeVisible();
  });

  test("cancels editing without changing value", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();

    // Note the original plan value
    const dialog = page.getByRole("dialog");
    const originalValue = await dialog.locator(".value").nth(1).textContent();

    await page.getByLabel("Edit plan value").click();
    const input = page.getByPlaceholder("Enter value");
    await input.fill("9999");
    await page.getByLabel("Cancel").click();

    // Value should be unchanged
    await expect(dialog.locator(".value").nth(1)).toHaveText(originalValue!);
  });

  test("saves on Enter key press", async ({ page }) => {
    await page.getByTestId("kpi-row").first().click();
    await page.getByLabel("Edit plan value").click();

    const input = page.getByPlaceholder("Enter value");
    await input.clear();
    await input.fill("2500");
    await input.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("2,500")).toBeVisible();
  });
});
