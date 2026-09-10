import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Scenario 3 (build brief §55): an overdue deadline surfaces as a dashboard
// warning and in the deadline center, with a next action leading back to
// the application. prisma/seed.ts hand-authors one Housing Assistance
// application with a deadline 3 days in the past, so this is deterministic.
test("overdue deadline surfaces on the staff dashboard and deadline center", async ({ page }) => {
  await login(page, "caseworker@civicflow.dev");

  const overdueRow = page.getByText(/deadline\(s\) overdue/);
  await expect(overdueRow).toBeVisible({ timeout: 15000 });
  await overdueRow.click();
  await expect(page).toHaveURL(/\/deadlines/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: /Overdue \(\d+\)/ })).toBeVisible({ timeout: 15000 });

  // The "Overdue" section may contain several deadlines (seed data includes
  // both a hand-authored scenario and randomized bulk applications) — the
  // scenario under test is that a next action reliably leads back to the
  // underlying application, not which specific one is earliest.
  const viewLink = page.getByRole("link", { name: "View" }).first();
  await viewLink.click();
  await expect(page.getByText("Application progress")).toBeVisible({ timeout: 15000 });
});
