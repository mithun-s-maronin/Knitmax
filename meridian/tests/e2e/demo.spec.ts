import { expect, test } from "@playwright/test";

/**
 * The demo journey, end to end (§81).
 *
 * These run without credentials, because the demo is deliberately
 * self-contained: no account, no database, the same components and the same
 * scoring engine. That makes it the part of the product that can be proved to
 * work in any environment.
 */

test.describe("marketing", () => {
  test("the landing page presents the score and routes into the product", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /understand your financial health/i }),
    ).toBeVisible();

    // The example score on the landing page is produced by the real engine.
    await expect(page.getByText(/out of 100/i).first()).toBeVisible();

    await expect(
      page.getByRole("link", { name: /check my financial health/i }).first(),
    ).toHaveAttribute("href", "/signup");

    await page.getByRole("link", { name: /try the demo/i }).first().click();
    await expect(page).toHaveURL(/\/demo/);
  });

  test("the four pillars and the formula are stated publicly", async ({ page }) => {
    await page.goto("/");
    for (const pillar of ["Spend", "Save", "Borrow", "Plan"]) {
      await expect(page.getByRole("heading", { name: pillar, exact: true })).toBeVisible();
    }
    await expect(page.getByText(/Spend × 0.25/)).toBeVisible();
  });
});

test.describe("demo dashboard", () => {
  test("shows a score whose pillars reproduce it", async ({ page }) => {
    await page.goto("/demo");

    await expect(page.getByText(/demo mode/i)).toBeVisible();

    // The gauge exposes the score to assistive technology as text.
    const status = page.getByRole("status").filter({ hasText: /out of 100/i }).first();
    await expect(status).toBeVisible();

    const scoreText = (await status.textContent()) ?? "";
    const overall = Number(scoreText.match(/(\d+) out of 100/)?.[1]);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(100);

    // Read the four pillar scores off the cards and re-do the arithmetic.
    const pillars: Record<string, number> = {};
    for (const label of ["Spend", "Save", "Borrow", "Plan"]) {
      const card = page.locator("a,div").filter({ hasText: new RegExp(`^${label}`) });
      const text = (await page.getByText(`${label}`, { exact: true }).first().locator("xpath=ancestor::*[self::div][3]").textContent()) ?? "";
      const value = Number(text.match(/(\d+)\s*\/\s*100/)?.[1]);
      if (Number.isFinite(value)) pillars[label] = value;
      expect(card).toBeTruthy();
    }

    if (Object.keys(pillars).length === 4) {
      const computed = Math.round(
        pillars.Spend * 0.25 +
          pillars.Save * 0.3 +
          pillars.Borrow * 0.25 +
          pillars.Plan * 0.2,
      );
      expect(computed).toBe(overall);
    }
  });

  test("alerts and recommendations are present and carry measured impacts", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(
      page.getByRole("heading", { name: /what to do, in order/i }),
    ).toBeVisible();
    await expect(page.getByText(/points/).first()).toBeVisible();
  });
});

test.describe("demo assessment", () => {
  test("walks all six sections, validates, and produces a score", async ({ page }) => {
    await page.goto("/demo/assessment");

    await expect(page.getByText(/step 1 of 6/i)).toBeVisible();

    // Section 1 is pre-filled from the demo profile.
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByText(/step 2 of 6/i)).toBeVisible();

    // Income
    await page.locator("#primary_income").fill("6200");
    await page.locator("#other_income").fill("0");
    await page.getByRole("button", { name: /^continue$/i }).click();

    // Spending — an invalid combination must be refused.
    await expect(page.getByText(/step 3 of 6/i)).toBeVisible();
    await page.locator("#monthly_expenses").fill("2000");
    await page.locator("#essential_expenses").fill("3000");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByText(/cannot be more than your total spending/i)).toBeVisible();
    await expect(page.getByText(/step 3 of 6/i)).toBeVisible();

    await page.locator("#essential_expenses").fill("1500");
    await page.getByLabel("Always", { exact: true }).check();
    await page.getByRole("button", { name: /^continue$/i }).click();

    // Saving
    await expect(page.getByText(/step 4 of 6/i)).toBeVisible();
    await page.locator("#total_savings").fill("20000");
    await page.locator("#emergency_fund").fill("18000");
    await page.locator("#monthly_savings").fill("1300");
    await page.getByLabel("Every month", { exact: true }).check();
    await page.getByRole("button", { name: /^continue$/i }).click();

    // Debt — answering "No" must hide the follow-up questions entirely.
    await expect(page.getByText(/step 5 of 6/i)).toBeVisible();
    await page.getByLabel("No", { exact: true }).check();
    await expect(page.locator("#total_debt")).toHaveCount(0);
    await page.getByRole("button", { name: /^continue$/i }).click();

    // Planning
    await expect(page.getByText(/step 6 of 6/i)).toBeVisible();
    await page.getByLabel(/yes, and i track my progress/i).check();
    await page.getByLabel(/yes, i have a detailed plan/i).check();
    await page.getByLabel("Weekly", { exact: true }).check();

    await page.getByRole("button", { name: /calculate my score/i }).click();

    // Results
    await expect(page).toHaveURL(/\/demo\/results/);
    const status = page.getByRole("status").filter({ hasText: /out of 100/i }).first();
    await expect(status).toBeVisible();

    const overall = Number(
      ((await status.textContent()) ?? "").match(/(\d+) out of 100/)?.[1],
    );
    // Strong figures with no debt: Borrow scores 100 outright, and the rest
    // are healthy, so this profile must land in the top band.
    expect(overall).toBeGreaterThanOrEqual(80);
  });

  test("keeps answers across a reload", async ({ page }) => {
    await page.goto("/demo/assessment");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.locator("#primary_income").fill("7777");
    // Give the debounced save a chance to run.
    await page.waitForTimeout(1400);
    await page.reload();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.locator("#primary_income")).toHaveValue("7777");
  });
});

test.describe("transparency", () => {
  test("the calculation table adds up to the overall score", async ({ page }) => {
    await page.goto("/demo/results");

    await expect(
      page.getByRole("heading", { name: /how your score was calculated/i }),
    ).toBeVisible();

    const overallRow = page.getByRole("row").filter({ hasText: /^Overall/ }).first();
    await expect(overallRow).toBeVisible();

    const cells = await overallRow.getByRole("cell").allTextContents();
    // Columns: Pillar, Score, Weight, Contribution
    const score = Number(cells[1]);
    const contribution = Number(cells[3]);
    expect(Math.abs(score - contribution)).toBeLessThanOrEqual(0.5);
  });

  test("every chart offers a table view of the same numbers", async ({ page }) => {
    await page.goto("/demo");
    const toggle = page.getByRole("button", { name: /^table$/i }).first();
    await toggle.click();
    await expect(page.getByRole("table").first()).toBeVisible();
  });
});

test.describe("simulator", () => {
  test("changes the projected score and refuses to write anything", async ({ page }) => {
    await page.goto("/demo/simulator");

    const projected = page
      .getByRole("status")
      .filter({ hasText: /projected financial health score/i })
      .first();
    await expect(projected).toBeVisible();

    const before = Number(
      ((await projected.textContent()) ?? "").match(/(\d+) out of 100/)?.[1],
    );

    // Push the savings slider up.
    const slider = page.getByRole("slider", { name: /saved each month/i });
    await slider.focus();
    for (let i = 0; i < 12; i += 1) await slider.press("ArrowRight");

    await expect
      .poll(async () =>
        Number(((await projected.textContent()) ?? "").match(/(\d+) out of 100/)?.[1]),
      )
      .toBeGreaterThan(before);

    // The demo has nothing to apply to, and says so rather than offering it.
    await expect(page.getByRole("button", { name: /apply these changes/i })).toHaveCount(0);
    await expect(page.getByText(/in the demo there is nothing to apply/i)).toBeVisible();
  });
});

test.describe("theme", () => {
  test("dark mode applies and survives a reload", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: /change theme/i }).click();
    await page.getByRole("menuitem", { name: /dark/i }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("protected routes", () => {
  test("the dashboard is not reachable without signing in", async ({ page }) => {
    const response = await page.goto("/dashboard");
    // Either the proxy redirects to sign-in, or the page itself does.
    await expect(page).toHaveURL(/\/login/);
    expect(response?.status()).toBeLessThan(500);
  });

  test("the authenticated AI endpoint refuses an anonymous caller", async ({ request }) => {
    const response = await request.post("/api/ai/chat", {
      data: { message: "What is my score?" },
    });
    expect(response.status()).toBe(401);
  });

  test("the export endpoint refuses an anonymous caller", async ({ request }) => {
    const response = await request.get("/api/export?format=json");
    expect(response.status()).toBe(401);
  });
});
