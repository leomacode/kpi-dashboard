import { test, expect, type Page, type Route } from "@playwright/test";
import { STREAM_HEADERS, chartGaveUp, droppedMost, simpleAnswer } from "./askKpisStream";

// Every test mocks /api/ask — no real model is ever called (CI has no key,
// and `vite preview` doesn't serve the API anyway).

const stream = (body: string) => (route: Route) =>
  route.fulfill({ status: 200, headers: STREAM_HEADERS, body });

async function open(page: Page, ...responses: ((route: Route) => Promise<void>)[]) {
  let call = 0;
  await page.route("**/api/ask", (route) => {
    const respond = responses[Math.min(call++, responses.length - 1)];
    return respond(route);
  });
  await page.goto("/kpis");
  const panel = page.getByRole("region", { name: "Ask your KPIs" });
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("Ask your KPIs", () => {
  test("answers an example question with a chart and the work shown", async ({ page }) => {
    const panel = await open(page, stream(droppedMost));

    await panel.getByRole("button", { name: "Which metric dropped most last month?" }).click();

    const log = panel.getByRole("list", { name: "Conversation" });
    await expect(log).toContainText("Species-Rich Grassland dropped most");
    await expect(log).toContainText("You");

    const chart = panel.getByTestId("answer-chart");
    await expect(chart).toContainText("Change from September to October");
    await expect(chart.getByRole("listitem").first()).toContainText("Species-Rich Grassland−18.6 % worsened");

    // Example questions disappear once the conversation starts.
    await expect(panel.getByRole("list", { name: "Example questions" })).toHaveCount(0);
  });

  test("'Show the work' expands with the keyboard and lists every tool call", async ({ page }) => {
    const panel = await open(page, stream(droppedMost));
    await panel.getByRole("button", { name: "Which metric dropped most last month?" }).click();

    const work = panel.getByTestId("show-the-work");
    const summary = work.getByText("Show the work (2 tool calls)");
    await expect(summary).toBeVisible();
    await expect(work.getByText("comparePeriods")).toBeHidden();

    await summary.focus();
    await page.keyboard.press("Enter");

    await expect(work.getByText("comparePeriods")).toBeVisible();
    await expect(work.getByLabel("comparePeriods input")).toContainText('"periodA":{"from":"2026-09"}');
    await expect(work).toContainText("7 metrics: 2026-09 vs 2026-10");
    await expect(work).toContainText('Drew bar chart "Change from September to October"');
  });

  test("sends only plain-text history to the API", async ({ page }) => {
    const panel = await open(page, stream(droppedMost), stream(simpleAnswer));
    const input = panel.getByLabel("Your question");

    await input.fill("Which metric dropped most last month?");
    await input.press("Enter");
    await expect(panel.getByTestId("answer-chart")).toBeVisible();

    const request = page.waitForRequest("**/api/ask");
    await input.fill("Which are in Gold?");
    await input.press("Enter");

    expect((await request).postDataJSON()).toEqual({
      messages: [
        { role: "user", text: "Which metric dropped most last month?" },
        {
          role: "assistant",
          text: "Species-Rich Grassland dropped most: from 22.6 % to 18.4 % (−18.6 %), which is a worsening.",
        },
        { role: "user", text: "Which are in Gold?" },
      ],
    });
  });

  test("shows a clear note when the chart fails validation 3 times", async ({ page }) => {
    const panel = await open(page, stream(chartGaveUp));
    await panel.getByLabel("Your question").fill("How did ammonia develop?");
    await panel.getByRole("button", { name: "Ask" }).click();

    await expect(panel).toContainText("Ammonia emissions fell from 58 to 50.9");
    await expect(panel.getByTestId("chart-error")).toContainText(
      "A chart could not be drawn for this answer",
    );
    await expect(panel.getByTestId("answer-chart")).toHaveCount(0);

    await panel.getByText("Show the work (3 tool calls)").click();
    await expect(panel.getByTestId("show-the-work")).toContainText("Chart invalid 3/3, giving up");
  });

  test("shows the rate-limit message and recovers with Try again", async ({ page }) => {
    const panel = await open(
      page,
      (route) =>
        route.fulfill({
          status: 429,
          contentType: "text/plain",
          headers: { "retry-after": "42" },
          body: "Too many questions. Please wait 42 s and try again.",
        }),
      stream(simpleAnswer),
    );
    await panel.getByLabel("Your question").fill("Which are in Gold?");
    await panel.getByLabel("Your question").press("Enter");

    const alert = panel.getByRole("alert");
    await expect(alert).toHaveText(/Too many questions\. Please wait 42 s and try again\./);

    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(panel).toContainText("Four metrics are in the Gold tier.");
    await expect(panel.getByRole("alert")).toHaveCount(0);
  });

  test("hides raw error pages behind a generic message", async ({ page }) => {
    const panel = await open(page, (route) =>
      route.fulfill({ status: 404, contentType: "text/html", body: "<!doctype html><h1>Not found</h1>" }),
    );
    await panel.getByRole("button", { name: "Which KPIs are behind their plan?" }).click();
    await expect(panel.getByRole("alert")).toContainText(
      "The assistant is unavailable right now. Please try again later.",
    );
  });

  test("Ask is disabled for empty input and the input caps at 500 characters", async ({ page }) => {
    const panel = await open(page, stream(simpleAnswer));
    const ask = panel.getByRole("button", { name: "Ask" });
    const input = panel.getByLabel("Your question");

    await expect(ask).toBeDisabled();
    await input.fill("   ");
    await expect(ask).toBeDisabled();

    await input.fill("x".repeat(600));
    await expect(input).toHaveValue("x".repeat(500));
    await expect(panel).toContainText("500/500 characters");
  });

  test("New chat clears the conversation and returns focus to the input", async ({ page }) => {
    const panel = await open(page, stream(simpleAnswer));
    await panel.getByRole("button", { name: "Which KPIs are behind their plan?" }).click();
    await expect(panel).toContainText("Four metrics are in the Gold tier.");

    await panel.getByRole("button", { name: "New chat" }).click();

    await expect(panel).not.toContainText("Four metrics are in the Gold tier.");
    await expect(panel.getByRole("button", { name: "New chat" })).toHaveCount(0);
    await expect(panel.getByRole("list", { name: "Example questions" })).toBeVisible();
    await expect(panel.getByLabel("Your question")).toBeFocused();
  });
});
