import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    document.documentElement.requestFullscreen = async () => {};
  });
  const url =
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
    "/scripts/fixtures/proctor.html";
  await page.goto(url);
  const state = () => page.locator("#state").textContent().then(JSON.parse);
  await page.getByText("Start", { exact: true }).click();
  const deadline = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem("exam-test-test")).deadline,
  );
  assert.ok(deadline > Date.now());
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(100);
  assert.equal(
    (await state()).events.filter((x) => x === "exam_violation").length,
    1,
  );
  await page.getByText("Complete", { exact: true }).click();
  const completed = await state();
  await page.waitForTimeout(1300);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.deepEqual(await state(), completed);
  assert.equal(
    await page.evaluate(() => sessionStorage.getItem("exam-test-test")),
    null,
  );
  await page.evaluate(() =>
    sessionStorage.setItem(
      "exam-test-test",
      JSON.stringify({ deadline: Date.now() - 1000, violations: 1 }),
    ),
  );
  await page.reload();
  await page.getByText("Start", { exact: true }).click();
  await page.waitForTimeout(1200);
  assert.equal((await state()).submissions, 1);
  assert.equal((await state()).remaining, 0);
  console.log(
    "PASS StrictMode violations, completed assessment cleanup, and expired recovery submits once",
  );
} finally {
  await browser.close();
}
