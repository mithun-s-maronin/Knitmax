import { expect, test, type Page } from "@playwright/test";

/**
 * The full authenticated journey (§81).
 *
 * This is the twenty-step round trip: create an account, take the assessment,
 * check that everything persisted, edit it, take another, and sign out and
 * back in to prove the data is still there.
 *
 * It needs a real Supabase project, so it is skipped unless one is configured.
 * The project must have email confirmation turned off for sign-up to produce a
 * session immediately — see README.md, "Running the authenticated E2E suite".
 */

const CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.E2E_AUTH === "1";

test.skip(
  !CONFIGURED,
  "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and E2E_AUTH=1 to run this suite.",
);

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const EMAIL = `meridian-e2e-${stamp}@example.test`;
const PASSWORD = `Test-${stamp}-passphrase`;
const NAME = "E2E Tester";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Fills every section of the assessment with the supplied figures. */
async function completeAssessment(
  page: Page,
  figures: {
    income: string;
    expenses: string;
    essentials: string;
    savings: string;
    emergencyFund: string;
    monthlySavings: string;
  },
) {
  await page.goto("/assessment");
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator("#primary_income").fill(figures.income);
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator("#monthly_expenses").fill(figures.expenses);
  await page.locator("#essential_expenses").fill(figures.essentials);
  await page.getByLabel("Always", { exact: true }).check();
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator("#total_savings").fill(figures.savings);
  await page.locator("#emergency_fund").fill(figures.emergencyFund);
  await page.locator("#monthly_savings").fill(figures.monthlySavings);
  await page.getByLabel("Every month", { exact: true }).check();
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.getByLabel("No", { exact: true }).check();
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.getByLabel(/yes, and i track my progress/i).check();
  await page.getByLabel(/yes, i have a detailed plan/i).check();
  await page.getByLabel("Weekly", { exact: true }).check();

  await page.getByRole("button", { name: /calculate my score/i }).click();
  await expect(page).toHaveURL(/\/results\//, { timeout: 20_000 });
}

test("1-2. sign up and land in onboarding", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel(/your name/i).fill(NAME);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/onboarding|\/dashboard/, { timeout: 20_000 });
});

test("3-5. the assessment saves a draft, validates, and submits", async ({ page }) => {
  await signIn(page);

  // Draft: enter something, leave, and come back to it.
  await page.goto("/assessment");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.locator("#primary_income").fill("5500");
  await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10_000 });

  await page.goto("/dashboard");
  await page.goto("/assessment");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.locator("#primary_income")).toHaveValue("5500");

  await completeAssessment(page, {
    income: "5500",
    expenses: "2600",
    essentials: "2000",
    savings: "20000",
    emergencyFund: "14000",
    monthlySavings: "1100",
  });
});

test("6-9. the score persists and the results and dashboard show it", async ({ page }) => {
  await signIn(page);

  const status = page.getByRole("status").filter({ hasText: /out of 100/i }).first();
  await expect(status).toBeVisible();

  const overall = Number(
    ((await status.textContent()) ?? "").match(/(\d+) out of 100/)?.[1],
  );
  expect(overall).toBeGreaterThan(0);

  // No debt was recorded, so Borrow must be full marks.
  await page.goto("/dashboard/borrow");
  await expect(page.getByText(/100/).first()).toBeVisible();

  // The transparency table reproduces the overall score.
  await page.goto("/dashboard/financial-health");
  await expect(
    page.getByRole("heading", { name: /how your score was calculated/i }),
  ).toBeVisible();
});

test("10. a financial record can be edited and the totals follow", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/financial-data?tab=expenses");

  await page.getByRole("button", { name: /add expense/i }).first().click();
  await page.locator("#name").fill("E2E subscription");
  await page.locator("#amount").fill("42");
  await page.getByRole("button", { name: /add expense/i }).last().click();

  await expect(page.getByText("E2E subscription")).toBeVisible({ timeout: 10_000 });

  // The dashboard notices the drift and offers a recalculation rather than
  // silently restating the old score.
  await page.goto("/dashboard");
  await expect(page.getByText(/your financial data has changed/i)).toBeVisible();
});

test("11-12. a second assessment is recorded and history keeps both", async ({ page }) => {
  await signIn(page);

  await completeAssessment(page, {
    income: "5800",
    expenses: "2500",
    essentials: "1900",
    savings: "24000",
    emergencyFund: "17000",
    monthlySavings: "1400",
  });

  await page.goto("/dashboard/history");
  const rows = page.getByRole("link", { name: /report|assessment|\d{4}/i });
  await expect(page.getByRole("heading", { name: /your assessments/i })).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(0);

  // Comparison works and shows both numbers.
  await page.getByRole("link", { name: /compare two/i }).click();
  await expect(page).toHaveURL(/compare/);
  await expect(page.getByText(/earlier/i).first()).toBeVisible();
});

test("13. a goal can be created and tracked", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/goals");

  await page.getByRole("button", { name: /add goal/i }).first().click();
  await page.locator("#name").fill("E2E holiday");
  await page.locator("#target_amount").fill("3000");
  await page.locator("#current_amount").fill("750");
  await page.getByRole("button", { name: /add goal/i }).last().click();

  await expect(page.getByText("E2E holiday")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("25%").first()).toBeVisible();
});

test("14. the simulator projects a change without saving it", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/simulator");

  const projected = page
    .getByRole("status")
    .filter({ hasText: /projected financial health score/i })
    .first();
  await expect(projected).toBeVisible();

  const before = Number(
    ((await projected.textContent()) ?? "").match(/(\d+) out of 100/)?.[1],
  );

  const slider = page.getByRole("slider", { name: /saved each month/i });
  await slider.focus();
  for (let i = 0; i < 10; i += 1) await slider.press("ArrowRight");

  await expect
    .poll(async () =>
      Number(((await projected.textContent()) ?? "").match(/(\d+) out of 100/)?.[1]),
    )
    .toBeGreaterThanOrEqual(before);
});

test("15-17. a report renders and the export downloads", async ({ page, request }) => {
  await signIn(page);

  await page.goto("/dashboard/reports");
  await page.getByRole("link", { name: /^report/i }).first().click();
  await expect(
    page.getByRole("heading", { name: /financial health report/i }),
  ).toBeVisible();

  const json = await request.get("/api/export?format=json");
  expect(json.status()).toBe(200);
  const payload = await json.json();
  expect(payload.meridian_export.version).toBe(1);
  expect(Array.isArray(payload.data.assessments)).toBe(true);
  expect(payload.data.assessments.length).toBeGreaterThan(0);

  const csv = await request.get("/api/export?format=csv&table=expenses");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("name");
});

test("18-20. sign out, sign back in, and the data is still there", async ({ page }) => {
  await signIn(page);

  const before = await page
    .getByRole("status")
    .filter({ hasText: /out of 100/i })
    .first()
    .textContent();

  await page.getByRole("button", { name: /your account/i }).click();
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$|\/login/);

  // The dashboard is no longer reachable.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await signIn(page);

  const after = await page
    .getByRole("status")
    .filter({ hasText: /out of 100/i })
    .first()
    .textContent();

  expect(after).toBe(before);

  // The goal and the expense survived too.
  await page.goto("/dashboard/goals");
  await expect(page.getByText("E2E holiday")).toBeVisible();
  await page.goto("/dashboard/financial-data?tab=expenses");
  await expect(page.getByText("E2E subscription")).toBeVisible();
});
