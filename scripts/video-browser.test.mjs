import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const events = [];
  await p.route("**/api/**", (route) => {
    const req = route.request();
    if (req.url().includes("entity=activity") && req.method() === "POST")
      events.push(req.postDataJSON());
    return route.fulfill({ json: { activity: {}, records: [], messages: [] } });
  });
  await p.clock.install();
  await p.addInitScript(() => {
    window.players = [];
    window.YT = {
      Player: class {
        constructor(element, options) {
          this.options = options;
          this.state = -1;
          this.position = 0;
          this.at = performance.now();
          this.frame = document.createElement("iframe");
          this.frame.title = "YouTube video player";
          this.frame.style.width = "100%";
          this.frame.style.height = "100%";
          element.replaceWith(this.frame);
          window.players.push(this);
          window.video = this;
          setTimeout(() => options.events.onReady(), 0);
        }
        getCurrentTime() {
          return (
            this.position +
            (this.state === 1 ? (performance.now() - this.at) / 1000 : 0)
          );
        }
        getDuration() {
          return 100;
        }
        getPlayerState() {
          return this.state;
        }
        getPlaybackRate() {
          return 1;
        }
        change(state) {
          this.position = this.getCurrentTime();
          this.at = performance.now();
          this.state = state;
          this.options.events.onStateChange({ data: state });
        }
        seek(position) {
          this.position = position;
          this.at = performance.now();
        }
        destroy() {
          this.destroyed = true;
          this.frame.remove();
        }
      },
    };
  });
  await p.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5176") +
      "/scripts/fixtures/video.html",
  );
  await p.getByText(/Play this video inside Experivio/).waitFor();
  await p.clock.runFor(50);
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await p.evaluate(() => window.video.change(1));
  await p.clock.runFor(3500);
  await p.evaluate(() => window.video.change(2));
  await p.clock.runFor(2000);
  await p.waitForFunction(() => indexedDB.databases().then(() => true));
  await p.getByRole("button", { name: /Rerender/ }).click();
  assert.equal(
    await p.evaluate(() => window.players.filter((v) => !v.destroyed).length),
    1,
  );
  await p.evaluate(() => window.video.change(1));
  await p.clock.runFor(2500);
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await p.clock.runFor(10000);
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await p.clock.runFor(2000);
  await p.evaluate(() => window.video.seek(99));
  await p.clock.runFor(1000);
  await p.evaluate(() => window.video.change(0));
  await p.clock.runFor(500);
  await p.getByRole("button", { name: "Toggle resource" }).click();
  // Allow durable IndexedDB delivery/fetch microtasks to finish.
  await p.waitForTimeout(400);
  const total = events.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  assert.equal(
    events
      .filter((e) => e.kind === "video_progress")
      .reduce((sum, e) => sum + e.durationSeconds, 0),
    total,
    "Report progress events must include every tracked second",
  );
  assert.ok(
    total >= 7 && total <= 9,
    `Expected ~8 actual visible seconds, got ${total}`,
  );
  assert.ok(
    events.every(
      (e) => e.resourceId === "video-resource" && e.userId === "video-student",
    ),
  );
  assert.ok(
    events.every((e) => Number.isInteger(e.durationSeconds)),
    "Watch time must fit the database integer column",
  );
  assert.ok(
    !events.some((e) => e.kind === "video_complete"),
    "Seeking must not mark complete",
  );
  assert.ok(events.some((e) => e.kind === "video_pause"));
  await p.getByRole("button", { name: "Toggle resource" }).click();
  await p.clock.runFor(50);
  await p.evaluate(() => window.video.options.events.onError({ data: 101 }));
  await p
    .getByRole("alert")
    .filter({ hasText: "restricted from embedding" })
    .waitFor();
  await p.getByRole("button", { name: "Retry video" }).click();
  await p.clock.runFor(50);
  assert.equal(await p.getByRole("button", { name: "Retry video" }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS video: responsive player, StrictMode/remount, short playback, pause, hidden tab, seeking, durable event delivery, embed errors and retry.",
  );
} finally {
  await browser.close();
}
