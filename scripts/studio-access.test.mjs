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
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
  await page.goto(base);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('input[type=password]').fill("example-test");
    assert.ok((await page.locator('input[type=password]').boundingBox()).width > 100);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: url.pathname.endsWith("/users")
        ? { users: [{ id: "tester-fixture", name: "Platform Tester" }] }
        : {
            activity_logs: [
              {
                id: "e1",
                kind: "code_run",
                occurred_at: new Date().toISOString(),
                metadata: {
                  isTester: true,
                  runType: "learning-interaction",
                  curriculumItemId: "java-lab-1",
                  action: "debug_pause",
                  stage: "composite",
                  candidate: 4,
                  divisor: 2,
                  prime: false,
                  reflection: "Four has a divisor other than one and itself.",
                },
              },
            ],
          },
    });
  });
  await page.goto(base + "/scripts/fixtures/studio.html?faculty=1");
  await page
    .getByText("Tester activity · separate from student roster", {
      exact: true,
    })
    .tap();
  await page.getByText("Platform Tester · Tester", { exact: true }).waitFor();
  await page.locator("details details summary").tap();
  await page.getByText("Action: debug_pause", { exact: true }).waitFor();
  await page.getByText("composite", { exact: true }).waitFor();
  await page
    .getByText("Reflection: Four has a divisor other than one and itself.", {
      exact: true,
    })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.goto(base + "/scripts/fixtures/studio.html");
  await page.getByRole("button", { name: /JAVA · Lab 16\b/ }).tap();
  await page.getByLabel("green", { exact: true }).tap();
  await page.getByLabel("Traffic signal green", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Back to learning studio", exact: true })
    .tap();
  await page.getByRole("button", { name: /JAVA · Lab 17\b/ }).tap();
  await page.getByLabel("Pointer event surface").tap();
  await page
    .getByText(/mousePressed/)
    .first()
    .waitFor();
  console.log(
    "PASS faculty tester evidence, phone touch signal/pointer controls and mobile layout",
  );
} finally {
  await browser.close();
}
