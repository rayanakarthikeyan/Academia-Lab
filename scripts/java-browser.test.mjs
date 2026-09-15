import assert from "node:assert/strict";
import { javaLabFixtures } from "./java-lab-fixtures.mjs";
// Uses a separately installed Playwright, or the desktop app's bundled package.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
try {
  const page = await browser.newPage();
  const unexpectedRequests = [];
  page.on("request", (request) => {
    if (
      request.url().includes("example.com") ||
      request.url().includes("/api/code-runner")
    )
      unexpectedRequests.push(request.url());
  });
  // A blank same-origin host avoids app hot reloads interrupting compiler tests.
  await page.route("**/__java-test__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Java compiler tests</title>",
    }),
  );
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") + "/__java-test__",
  );
  for (const fixture of javaLabFixtures.filter(
    (f) =>
      !process.env.JAVA_TEST_FILTER ||
      new RegExp(process.env.JAVA_TEST_FILTER).test(f.name),
  )) {
    const result = await page.evaluate(async ({ code, stdin }) => {
      const { runCode } = await import("/src/platform/api.ts");
      return runCode("browser-test", {
        language: "java",
        code,
        stdin: stdin || "",
      });
    }, fixture);
    if (fixture.expectedError) {
      assert.equal(
        result.status,
        "error",
        fixture.name + ": " + JSON.stringify(result),
      );
      assert.match(result.stderr, fixture.expectedError, fixture.name);
    } else {
      assert.equal(
        result.status,
        "passed",
        fixture.name + ": " + JSON.stringify(result),
      );
      assert.equal(result.stdout.trim(), fixture.expected, fixture.name);
    }
    console.log("PASS", fixture.name, `(${result.durationMs} ms)`);
  }
  const stopped = await page.evaluate(async () => {
    const { runJavaInBrowser } = await import("/src/platform/java-browser.ts");
    const controller = new AbortController();
    return runJavaInBrowser(
      "public class Main { public static void main(String[] args) { while(true){} } }",
      "",
      {
        signal: controller.signal,
        onProgress: (phase) => {
          if (phase === "Running Java…")
            setTimeout(() => controller.abort(), 100);
        },
      },
    );
  });
  assert.equal(stopped.status, "error");
  assert.match(stopped.stderr, /stopped/);
  assert.equal(
    await page.locator('iframe[title="Isolated Java compiler"]').count(),
    0,
  );
  assert.deepEqual(unexpectedRequests, []);
  console.log("PASS cancellation, iframe cleanup, and blocked network bridge");
} finally {
  await browser.close();
}
