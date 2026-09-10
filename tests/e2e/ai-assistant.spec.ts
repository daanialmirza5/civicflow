import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Scenario 4 (build brief §55): an AI question triggers structured evidence
// retrieval and returns a grounded explanation, with the evidence visible
// to the citizen (never a bare, unsourced claim).
test("AI civic assistant answers with visible structured evidence", async ({ page }) => {
  await login(page, "citizen@civicflow.dev");

  await page.goto("/applications");
  const blockedCard = page.locator("a", { hasText: "Blocked" }).first();
  await expect(blockedCard).toBeVisible({ timeout: 15000 });
  await blockedCard.click();

  await expect(page.getByText("Civic assistant")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Why is my application blocked?" }).click();

  // A provider badge (mock by default — no API key configured in test env) confirms a real round trip happened.
  await expect(page.getByText("mock", { exact: true })).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Show evidence" }).click();
  await expect(page.getByText("Source: structured application record")).toBeVisible();
  await expect(page.getByText("Source: structured document record")).toBeVisible();
});
