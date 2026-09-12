import { test, expect } from "@playwright/test";
import { requireAcceptanceEnvironment } from "../lib/config.mjs";

for (const [role, emailName, passwordName, path] of [
  ["student", "ACCEPTANCE_STUDENT_A_EMAIL", "ACCEPTANCE_STUDENT_A_PASSWORD", "/academic"],
  ["teacher", "ACCEPTANCE_TEACHER_EMAIL", "ACCEPTANCE_TEACHER_PASSWORD", "/teacher"],
  ["administrator", "ACCEPTANCE_ADMIN_EMAIL", "ACCEPTANCE_ADMIN_PASSWORD", "/admin"],
]) {
  test(`${role} controlled identity reaches its protected workspace`, async ({ page }) => {
    const env = requireAcceptanceEnvironment(["ACCEPTANCE_WEB_URL", emailName, passwordName, "SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY"]);
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(env[emailName]);
    await page.getByLabel(/password/i).fill(env[passwordName]);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.goto(path);
    await expect(page).not.toHaveURL(/sign-in/);
  });
}

const workspaceAffordances = [
  ["student", "ACCEPTANCE_STUDENT_A_EMAIL", "ACCEPTANCE_STUDENT_A_PASSWORD", "/academic", /assignments/i],
  ["teacher", "ACCEPTANCE_TEACHER_EMAIL", "ACCEPTANCE_TEACHER_PASSWORD", "/teacher", /student submissions/i],
  ["administrator", "ACCEPTANCE_ADMIN_EMAIL", "ACCEPTANCE_ADMIN_PASSWORD", "/admin", /class placement/i],
];

for (const [role, emailName, passwordName, path, affordance] of workspaceAffordances) {
  test(`${role} sees the connected academic workflow affordance`, async ({ page }) => {
    const env = requireAcceptanceEnvironment(["ACCEPTANCE_WEB_URL", emailName, passwordName, "SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY"]);
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(env[emailName]);
    await page.getByLabel(/password/i).fill(env[passwordName]);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.goto(path);
    await expect(page.getByText(affordance).first()).toBeVisible();
  });
}
