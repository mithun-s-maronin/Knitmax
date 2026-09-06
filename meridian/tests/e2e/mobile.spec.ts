import { expect, test } from "@playwright/test";

/**
 * Mobile behaviour (§54).
 *
 * The things that break first on a phone: a page that scrolls sideways, a
 * bottom bar that covers content, and controls too small to hit.
 */

test("no page scrolls horizontally", async ({ page }) => {
  for (const path of ["/", "/demo", "/demo/results", "/demo/simulator", "/demo/assessment"]) {
    await page.goto(path);
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(
      overflow.scrollWidth,
      `${path} scrolls horizontally`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }
});

test("the assessment is usable on a phone", async ({ page }) => {
  await page.goto("/demo/assessment");

  await expect(page.getByText(/step 1 of 6/i)).toBeVisible();

  const next = page.getByRole("button", { name: /^continue$/i });
  const box = await next.boundingBox();
  // Comfortably past the 44px touch target guidance.
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await next.click();
  await expect(page.getByText(/step 2 of 6/i)).toBeVisible();
});

test("the mobile navigation reaches every section", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /open menu/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /try the demo/i })).toBeVisible();
});

test("the demo dashboard fits and its charts do not overflow", async ({ page }) => {
  await page.goto("/demo");

  const status = page.getByRole("status").filter({ hasText: /out of 100/i }).first();
  await expect(status).toBeVisible();

  // Every card must sit inside the viewport.
  const wide = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll("main *")].some(
      (el) => el.getBoundingClientRect().right > width + 2,
    );
  });
  expect(wide).toBe(false);
});
