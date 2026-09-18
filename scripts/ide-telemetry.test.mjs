import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
  let offline = true;
  let reject = false;
  const delivered = new Map();
  const attempts = [];
  await page.route("**/api/platform?entity=activity", async (route) => {
    const body = route.request().postDataJSON();
    attempts.push(body);
    if (offline)
      return route.fulfill({ status: 503, json: { error: "Test outage" } });
    if (reject)
      return route.fulfill({ status: 403, json: { error: "Test denial" } });
    delivered.set(body.eventId, body);
    await route.fulfill({ json: { activity: body } });
  });
  const url =
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
    "/scripts/fixtures/features.html?telemetry=1";
  await page.goto(url);
  await page.getByRole("button", { name: /SQL sum/ }).click();
  await page.locator(".monaco-editor .view-lines").waitFor();
  const boxes = await Promise.all([
    page.getByText("Instructions", { exact: true }).boundingBox(),
    page.locator(".monaco-editor").boundingBox(),
    page.getByRole("complementary", { name: "Program output" }).boundingBox(),
  ]);
  assert.ok(
    boxes[0].x < boxes[1].x && boxes[1].x < boxes[2].x,
    "Instructions/editor/output must be left/middle/right",
  );
  await page.locator(".monaco-editor .view-lines").click();
  await page.locator(".monaco-editor").evaluate((node) => {
    const data = new DataTransfer();
    data.setData("text", "SELECT broken;");
    node.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData: data }),
    );
    node.dispatchEvent(new ClipboardEvent("copy", { bubbles: true }));
  });
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("SELECT broken;");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page
    .getByRole("complementary", { name: "Program output" })
    .getByText(/no such column/i)
    .waitFor();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("SELECT (2 + 3) AS total;");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByText(/total\s+5/, { exact: true }).waitFor();
  await page.getByRole("button", { name: "Check sample cases" }).click();
  await page.getByText(/0\/1 sample cases matched/).waitFor(); // Reference is deliberately missing the SQL column header.
  await mkdir(new URL("../tmp/", import.meta.url), { recursive: true });
  await page.screenshot({
    path: fileURLToPath(new URL("../tmp/ide-desktop.png", import.meta.url)),
  });
  await page.getByRole("button", { name: /Timeline/ }).click();
  await page.getByText("Error resolved", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("Tests passed", { exact: true }).count(),
    0,
  );
  await page.waitForFunction(async () => {
    const { activityDeliveryStatus } =
      await import("/src/platform/activity-delivery.ts");
    return (await activityDeliveryStatus("student-test")).pending >= 3;
  });
  offline = false;
  const queued = await page.evaluate(async () => {
    const m = await import("/src/platform/activity-delivery.ts");
    return (await m.activityDeliveryStatus("student-test")).pending;
  });
  await page.reload();
  await page.getByRole("button", { name: /SQL sum/ }).click();
  await page.waitForFunction(async () => {
    const { activityDeliveryStatus } =
      await import("/src/platform/activity-delivery.ts");
    return (await activityDeliveryStatus("student-test")).pending === 0;
  });
  await page.exposeFunction(
    "receivedAllEvents",
    () => delivered.size >= queued,
  );
  await page.waitForFunction(() => window.receivedAllEvents());
  const deadline = Date.now() + 30000;
  while (
    Date.now() < deadline &&
    ![...delivered.values()].some(
      (e) => e.metadata.recoveredAfterError && e.metadata.sourceChanged,
    )
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(
    [...delivered.values()].some(
      (item) => item.kind === "editor_change" && item.metadata.changes < 25,
    ),
    JSON.stringify({
      delivered: [...delivered.values()],
      attempts,
      status: await page.evaluate(async () =>
        (
          await import("/src/platform/activity-delivery.ts")
        ).activityDeliveryStatus("student-test"),
      ),
    }),
  );
  assert.ok(
    [...delivered.values()].some(
      (item) =>
        item.kind === "code_run" && item.metadata.sourceDigest?.length === 64,
    ),
    JSON.stringify([...delivered.values()]),
  );
  assert.ok(
    attempts.some(
      (item) =>
        attempts.filter((other) => other.eventId === item.eventId).length > 1,
    ),
    "Retry must reuse the event ID",
  );
  assert.ok(
    [...delivered.values()].every(
      (item) => !item.assignmentId && item.resourceId === "resource-test",
    ),
    "Practice telemetry must belong to its resource",
  );
  reject = true;
  const evidence = [...delivered.values()];
  assert.ok(evidence.some((e) => e.kind === "editor_paste"));
  assert.ok(evidence.some((e) => e.metadata.action === "code_copy"));
  assert.ok(evidence.some((e) => e.metadata.afterError));
  assert.ok(
    evidence.some(
      (e) =>
        e.metadata.recoveredAfterError &&
        e.metadata.sourceChanged &&
        e.metadata.sourceSnapshot.includes("SELECT"),
    ),
    JSON.stringify(evidence),
  );
  await page.evaluate(async () => {
    const { enqueueActivity, flushActivity } =
      await import("/src/platform/activity-delivery.ts");
    await enqueueActivity("test", {
      userId: "student-test",
      kind: "code_run",
      metadata: {},
    });
    await flushActivity("student-test", "test");
  });
  await page
    .getByRole("status")
    .filter({ hasText: /records were rejected/ })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    "Workspace must not overflow on mobile",
  );
  await page.route("**/api/platform?entity=activity&detail=1**", (route) =>
    route.fulfill({
      json: {
        activity_logs: evidence.map((e, i) => ({
          id: String(i),
          kind: e.kind,
          metadata: e.metadata,
          occurred_at: new Date().toISOString(),
          resource_id: e.resourceId,
        })),
        hasMore: false,
      },
    }),
  );
  await page.route("**/api/ai-chat-logs**", (route) =>
    route.fulfill({ json: { summaries: [] } }),
  );
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
      "/scripts/fixtures/tutor.html?faculty=1",
  );
  await page.getByRole("button", { name: "Open report" }).click();
  await page.getByRole("tab", { name: "IDE activity", exact: true }).click();
  await page.getByText("Pasted into editor", { exact: true }).waitFor();
  await page.getByText("Copied from editor", { exact: true }).waitFor();
  await page.getByText("Edited after an error", { exact: true }).waitFor();
  await page
    .getByText("Run completed after an earlier failure.", { exact: true })
    .waitFor();
  console.log(
    "PASS: three-panel layout, mobile fit, sample mismatches, short edit telemetry, durable retries, identity links, source digests and rejected-delivery status.",
  );
} finally {
  await browser.close();
}
