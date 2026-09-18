import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  let sent = [];
  let saved = [];
  let events = [];
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname.endsWith("ai-chat-logs"))
      return route.fulfill({
        json: url.searchParams.has("summary")
          ? {
              summaries: [
                { userId: "student-test", requests: 8, answered: 6, failed: 2 },
              ],
            }
          : { records: saved, hasMore: false },
      });
    if (url.pathname.endsWith("ai-chat")) {
      if (req.method() === "POST") {
        const body = req.postDataJSON();
        sent.push(body);
        const record = {
          id: "tutor:" + sent.length,
          body: body.message,
          status: "answered",
          metadata: {
            title: "SQL sum",
            role: "exchange",
            answer: "Asha, compare the two operands.",
            work: body.work,
            context: { instructions: "Compute a sum" },
          },
        };
        saved.unshift(record);
        return route.fulfill({ json: { record } });
      }
      return route.fulfill({ json: { records: saved, hasMore: false } });
    }
    if (url.pathname.endsWith("platform")) {
      events.push(req.postDataJSON());
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { assignments: [], records: [] } });
  });
  await page.clock.install();
  await page.goto(base + "/scripts/fixtures/features.html?telemetry=1");
  await page.getByRole("button", { name: /SQL sum/ }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("SELECT 6 + 7;");
  assert.equal(
    await page
      .getByRole("button", { name: /AI Tutor/ })
      .getAttribute("aria-expanded"),
    "true",
  );
  await page
    .getByLabel("Your question", { exact: true })
    .fill("Why does this return 13?");
  await page.getByRole("button", { name: "Ask tutor", exact: true }).click();
  await page
    .getByText("Asha, compare the two operands.", { exact: false })
    .waitFor();
  assert.equal(sent[0].context.kind, "resource");
  assert.equal(sent[0].context.questionId, "sql");
  assert.equal(sent[0].work.code, "SELECT 6 + 7;");
  await page.getByRole("button", { name: "Refresh history" }).click();
  assert.equal(await page.getByText(/Asha, compare/).count(), 1);
  await page.clock.runFor(35000);
  assert.ok(
    events.some(
      (e) =>
        e?.metadata?.activity === "active_learning" && e.durationSeconds > 0,
    ),
  );
  await page.clock.runFor(90000);
  const before = events.filter(
    (e) => e?.metadata?.activity === "active_learning",
  ).length;
  await page.clock.runFor(60000);
  assert.equal(
    events.filter((e) => e?.metadata?.activity === "active_learning").length,
    before,
  );
  await page.goto(base + "/scripts/fixtures/tutor.html");
  await page.getByRole("button", { name: /AI Tutor/ }).click();
  await page.getByLabel("Relevant passage").fill("SQL arithmetic adds numbers");
  await page
    .getByLabel("Your question", { exact: true })
    .fill("Explain this passage");
  await page.getByRole("button", { name: "Ask tutor", exact: true }).click();
  await page.getByText(/Explain this passage/).waitFor();
  assert.equal(sent.at(-1).work.excerpt, "SQL arithmetic adds numbers");
  await page.goto(base + "/scripts/fixtures/tutor.html?faculty=1");
  await page
    .getByText(/Frequent use/)
    .first()
    .waitFor();
  assert.equal(await page.getByText("Tester", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Open report" }).click();
  await page.getByRole("tab", { name: "Chat history" }).click();
  await page.getByText("Explain this passage", { exact: false }).waitFor();
  await page
    .getByText("Instructions and work shared with this question")
    .first()
    .click();
  await page.getByText(/SQL arithmetic adds numbers/).waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  console.log(
    "PASS live work context, personal replies, saved history, resource excerpts, active/idle learning time, faculty metrics, tester separation, chat snapshots and responsive reports",
  );
} finally {
  await browser.close();
}
