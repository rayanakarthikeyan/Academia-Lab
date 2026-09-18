import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1100 } });
  p.on("pageerror", (error) => console.error("PAGE ERROR", error.message));
  await p.route("**/api/**", (route) =>
    route.fulfill({ json: { records: [], hasMore: false, assignments: [] } }),
  );
  await p.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
      "/scripts/fixtures/features.html",
  );
  await p.getByRole("button", { name: /SQL sum/ }).click();
  await p.locator(".monaco-editor").waitFor();
  const instructions = p.getByRole("complementary", {
    name: "Experiment instructions",
  });
  const editor = p.locator(".monaco-editor");
  const output = p.getByRole("complementary", { name: "Program output" });
  const tutor = p.getByRole("region", { name: "AI Tutor" });
  const boxes = await Promise.all(
    [instructions, editor, output, tutor].map((l) => l.boundingBox()),
  );
  assert.ok(boxes.every(Boolean));
  for (let i = 1; i < boxes.length; i++)
    assert.ok(
      boxes[i].x > boxes[i - 1].x,
      "Four panels must run instructions → editor → output → tutor",
    );
  assert.ok(
    Math.abs(boxes[0].y - boxes[3].y) < 10,
    "Tutor should align with the workspace, not sit above it",
  );
  await p
    .getByLabel("Your question", { exact: true })
    .fill("Help me add two values");
  for (const width of [1440, 1280, 768, 390, 320]) {
    await p.setViewportSize({ width, height: 1100 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `No page overflow at ${width}`,
    );
    assert.equal(
      await p.getByLabel("Your question", { exact: true }).inputValue(),
      "Help me add two values",
    );
    if (width === 1440) {
      const o = await output.boundingBox(),
        t = await tutor.boundingBox();
      assert.ok(
        Math.abs(o.x - t.x) < 5 && t.y > o.y,
        "Tutor follows output in the right rail",
      );
    }
  }
  await p.screenshot({ path: "tmp/workspace-chat-mobile.png", fullPage: true });
  await p.setViewportSize({ width: 1920, height: 1100 });
  await p.screenshot({
    path: "tmp/workspace-chat-desktop.png",
    fullPage: true,
  });
  console.log(
    "PASS four-panel order, right-side tutor, responsive stacking, retained chat input and no horizontal page overflow",
  );
} finally {
  await browser.close();
}
