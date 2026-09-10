import { test, expect } from "@playwright/test";

// Scenario 1 (build brief §55): citizen completes a profile, discovers a
// service, evaluates eligibility, and creates an application.
test("citizen can register, discover a matching service, and start an application", async ({ page }) => {
  const email = `e2e-${Date.now()}@demo.civicflow.dev`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Test Citizen");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("TestPassword123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // Complete profile so eligibility can be evaluated meaningfully.
  await page.goto("/profile");
  await page.getByLabel("Age").fill("20");
  await page.getByLabel("Residency (state)").fill("Maharashtra");
  await page.getByLabel("Annual income (₹)").fill("250000");
  await page.getByLabel("Currently a student").selectOption("true");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10000 });

  // Discover services and open the top match.
  await page.goto("/services");
  await expect(page.locator('a[href^="/services/"]').first()).toBeVisible({ timeout: 15000 });
  await page.getByText("Student Education Support").first().click();
  await expect(page.getByRole("heading", { name: "Student Education Support" })).toBeVisible({ timeout: 15000 });

  // Eligibility explanation should render rule-by-rule.
  await expect(page.getByText("Your eligibility")).toBeVisible();

  // Start an application.
  await page.getByRole("button", { name: "Start application" }).click();
  await expect(page).toHaveURL(/\/applications\/.+/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Student Education Support" })).toBeVisible();
  await expect(page.getByText("Draft", { exact: false })).toBeVisible();
});
