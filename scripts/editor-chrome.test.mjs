import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
      "/scripts/fixtures/features.html",
  );
  await page.getByRole("button", { name: /SQL sum/ }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("SELECT 2 AS first;\nSELECT 3 AS second;");
  await page.locator(".line-numbers").filter({ hasText: /^2$/ }).waitFor();
  await page.getByText("Ln 2, Col 20", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Wrap on", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Wrap off", exact: true })
      .getAttribute("aria-pressed"),
    "false",
  );
  await page.getByRole("button", { name: "Find", exact: true }).click();
  await page.locator(".find-widget.visible").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByText(/second\s+3/).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  console.log(
    "PASS line numbers, cursor status, find, wrap toggle, SQL execution and mobile width",
  );
} finally {
  await browser.close();
}
