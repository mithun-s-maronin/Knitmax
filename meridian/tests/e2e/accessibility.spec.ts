import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility checks (§67).
 *
 * axe catches the mechanical failures — contrast, names, roles, landmark
 * structure. It does not catch everything, so the suite also asserts the
 * things that matter here and that a scanner cannot judge: that the score is
 * available as text, that every form control has a label, and that focus goes
 * somewhere sensible.
 */

const PAGES = [
  { path: "/", name: "landing" },
  { path: "/login", name: "sign in" },
  { path: "/signup", name: "sign up" },
  { path: "/demo", name: "demo dashboard" },
  { path: "/demo/results", name: "demo results" },
  { path: "/demo/assessment", name: "demo assessment" },
  { path: "/demo/simulator", name: "demo simulator" },
];

for (const target of PAGES) {
  test(`${target.name} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(target.path);
    await page.waitForTimeout(600);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`),
      `${target.name} violations`,
    ).toEqual([]);
  });
}

test("the score is announced as text, not only drawn", async ({ page }) => {
  await page.goto("/demo");
  const status = page.getByRole("status").filter({ hasText: /out of 100/i }).first();
  await expect(status).toContainText(/\d+ out of 100/);
});

test("every visible form control in the assessment has an accessible name", async ({
  page,
}) => {
  await page.goto("/demo/assessment");

  const unnamed = await page.evaluate(() => {
    const controls = [
      ...document.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]), select, textarea, [role=radio], [role=checkbox], [role=slider]",
      ),
    ];
    return controls
      .filter((el) => el.offsetParent !== null)
      // Radix renders a hidden native <select> for form integration. It is
      // aria-hidden, so it is not in the accessibility tree at all.
      .filter((el) => !el.closest("[aria-hidden='true']") && el.getAttribute("aria-hidden") !== "true")
      .filter((el) => {
        const id = el.getAttribute("id");
        const labelled =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
          el.closest("label");
        return !labelled;
      })
      .map((el) => el.outerHTML.slice(0, 120));
  });

  expect(unnamed).toEqual([]);
});

test("the skip link is the first thing a keyboard reaches", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
  expect(focused).toMatch(/skip to content/i);
});

test("moving to the next assessment section moves focus with it", async ({ page }) => {
  await page.goto("/demo/assessment");
  await page.getByRole("button", { name: /^continue$/i }).click();

  const focusedId = await page.evaluate(() => document.activeElement?.id ?? "");
  expect(focusedId).toBe("section-heading");
});
