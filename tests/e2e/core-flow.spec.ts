import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

async function navigate(page: Page, label: string) {
  const menu = page.getByRole("button", { name: "Toggle navigation" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: label, exact: true })
    .click();
}

for (const offline of [false, true]) {
  test(`${offline ? "Browser-only" : "Backend"} showroom, workflow, configuration, service and reports`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    if (offline) await page.route("**/api/v1/**", (route) => route.abort());
    await page.goto("/");
    if (offline) {
      await expect(page.getByText("LOCAL DEMO ACTIVE", { exact: true })).toBeVisible();
      await expect(page.getByText("WORKSPACE CONNECTION REQUIRED")).toHaveCount(0);
    }
    await expect(
      page.getByRole("heading", { name: "ONE PLATFORM. EVERY POSSIBILITY." }),
    ).toBeVisible();
    await expect(page.getByText("DEMO ASSISTANT · NO LLM CONNECTED")).toBeVisible();
    await expect(page.getByLabel("Your build summary")).toContainText("AUTONEX XUV");
    await expect(page.getByLabel("Showroom model", { exact: true })).toHaveValue(
      "autonex-xuv-demo",
    );
    await expect(page.getByLabel("Your build summary")).toContainText("$89,900");
    await expect(page.locator(".vehicle-canvas canvas")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: testInfo.outputPath("autonex-light.png"), fullPage: true });
    await page.getByLabel("Showroom model", { exact: true }).selectOption("bmw-i4-demo");
    await expect(page.getByLabel("Your build summary")).toContainText("BMW i4");
    await page.getByLabel("Showroom model", { exact: true }).selectOption("autonex-xuv-demo");
    await page.getByRole("button", { name: "FEATURES", exact: true }).click();
    await page.getByRole("radio", { name: /Adventure Performance.*620/ }).check();
    await expect(page.getByLabel("Your build summary")).toContainText("$109,900");
    await page
      .getByRole("group", { name: "Assistant mode" })
      .getByRole("button", { name: "AI ASSISTANT", exact: true })
      .click();
    await page.getByRole("button", { name: "Find a sporty car for my everyday drive" }).click();
    await expect(
      page.getByRole("heading", { name: "Meet your BMW i4 Performance." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Run details", exact: true }).click();
    await expect(page.getByText("Master orchestrator", { exact: true })).toBeVisible();
    await expect(page.getByText("Validation agent", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Recommendation", exact: true }).click();
    await page.getByRole("button", { name: "Apply configuration" }).click();
    await expect(page.getByRole("radio", { name: /Performance.*455/ })).toBeChecked();
    await page
      .getByLabel("Exterior paint", { exact: false })
      .last()
      .selectOption("color-jet-black");
    await expect(page.getByLabel("Your build summary")).toContainText("$69,800");
    await navigate(page, "MODEL COMPARISON");
    await expect(page.getByRole("heading", { name: "Find your kind of electric." })).toBeVisible();
    await page.getByRole("button", { name: "Explore BMW iX" }).click();
    await expect(page.getByLabel("Your build summary")).toContainText("BMW iX");
    await page.getByRole("button", { name: "REQUEST DEMO TEST DRIVE", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Your name").fill("Alex Morgan");
    await dialog.getByLabel("Email address").fill("alex@example.com");
    await dialog.getByLabel("Preferred date").fill("2099-01-15");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Request a test drive" }).click();
    await expect(dialog.getByText("REQUEST RECEIVED")).toBeVisible();
    await expect(dialog.getByText(/does not confirm a reservation/)).toBeVisible();
    await dialog.getByRole("button", { name: "Back to the collection" }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "SERVICE DEMO", exact: true }).click();
    const service = page.getByRole("dialog");
    await service.getByRole("button", { name: "SIMULATE REQUEST", exact: true }).click();
    await expect(service.getByRole("heading", { name: "DEMONSTRATION COMPLETE" })).toBeVisible();
    await expect(service).toContainText("No booking was created");
    await service.getByRole("button", { name: "CLOSE WORKSPACE DIALOG" }).click();
    await navigate(page, "KNOWLEDGE HUB");
    await page.locator("summary").filter({ hasText: "BMW i4 · Reference notes" }).click();
    await expect(page.getByRole("heading", { name: "Public BMW reference notes" })).toBeVisible();
    await navigate(page, "OPERATIONS");
    await expect(page.getByRole("heading", { name: "EXECUTION & RETRY HISTORY" })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toContainText("successful");
    await navigate(page, "REPORTS");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "DOWNLOAD PDF" }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^autonex-.*\.pdf$/);
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    expect((await readFile(downloadedPath!)).subarray(0, 5).toString()).toBe("%PDF-");
    await navigate(page, "SETTINGS");
    await page.getByRole("button", { name: "DARK MODE", exact: true }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByLabel("Your build summary")).toContainText("AUTONEX XUV");
    await expect(page.getByLabel("Showroom model", { exact: true })).toHaveValue(
      "autonex-xuv-demo",
    );
    await expect(page.getByLabel("Your build summary")).toContainText("$89,900");
    await expect(page.locator(".vehicle-canvas canvas")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: testInfo.outputPath("autonex-dark.png"), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
    expect(
      await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain("Times New Roman");
  });
}

test("catalog failure opens a functional local demo and can reconnect", async ({ page }) => {
  await page.route("**/api/v1/vehicles", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"detail":"Catalog temporarily unavailable"}',
    }),
  );
  await page.goto("/");
  await expect(page.getByText("LOCAL DEMO ACTIVE", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Your selected vehicle")).toBeVisible();
  await page.unroute("**/api/v1/vehicles");
  await page.getByRole("button", { name: "CHECK CONNECTION", exact: true }).click();
  await expect(page.locator(".environment-label")).toContainText("API CONNECTED");
  await expect(page.getByText("LOCAL DEMO ACTIVE", { exact: true })).toHaveCount(0);
});
