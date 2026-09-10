import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Scenario 2 (build brief §55): an application is blocked on a missing
// document; the citizen uploads it, a case worker verifies it, and the
// blocker clears. Uses the seeded demo citizen's flagship blocked
// application (Student Education Support), which prisma/seed.ts always
// creates with Income certificate and Enrollment proof NOT_PROVIDED.
test("citizen uploads a missing document, case worker verifies it, blocker clears", async ({ page }) => {
  await login(page, "citizen@civicflow.dev");

  await page.goto("/applications");
  const blockedCard = page.locator("a", { hasText: "Blocked" }).first();
  await expect(blockedCard).toBeVisible({ timeout: 15000 });
  await blockedCard.click();
  await expect(page.getByText("Why is this stuck?")).toBeVisible({ timeout: 15000 });

  // Confirm the causal chain names the missing document explicitly.
  await expect(page.getByText("Income certificate has not been provided.").first()).toBeVisible();

  const incomeCertRow = page.locator(".rounded-lg.border.border-slate-200.p-3").filter({ hasText: "Income certificate" });
  await incomeCertRow.getByRole("button", { name: "Upload document (demo)" }).click();
  await expect(incomeCertRow.getByText("UPLOADED")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Income certificate has not been provided.")).toHaveCount(0, { timeout: 15000 });

  const applicationUrl = page.url();

  // Switch to the case worker and verify the newly uploaded document.
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "caseworker@civicflow.dev");
  await page.goto(applicationUrl);

  const incomeCertRowStaff = page.locator(".rounded-lg.border.border-slate-200.p-3").filter({ hasText: "Income certificate" });
  await incomeCertRowStaff.getByRole("button", { name: "Review document" }).click();
  await incomeCertRowStaff.getByRole("button", { name: "Verify" }).click();

  await expect(incomeCertRowStaff.getByText("VERIFIED")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Income certificate has not been provided.")).toHaveCount(0, { timeout: 15000 });
  // Enrollment proof is still missing, so the application should still show one open blocker.
  await expect(page.getByText("Enrollment proof has not been provided.").first()).toBeVisible();
});
