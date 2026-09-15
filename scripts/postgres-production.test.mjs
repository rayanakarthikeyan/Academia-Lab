import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const page = await browser.newPage();
  await page.route("**/__production-runtime__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Production runtime check</title>",
    }),
  );
  await page.goto(
    (process.env.PRODUCTION_TEST_URL || "http://127.0.0.1:4173") +
      "/__production-runtime__",
  );
  const assets = await readdir(new URL("../dist/assets/", import.meta.url));
  const workerFile = assets.find((name) =>
    /^postgres\.worker-.*\.js$/.test(name),
  );
  assert.ok(workerFile);
  const result = await page.evaluate(
    (workerFile) =>
      new Promise((resolve, reject) => {
        const worker = new Worker("/assets/" + workerFile, { type: "module" });
        const timer = setTimeout(() => {
          worker.terminate();
          reject(new Error("Production worker timed out"));
        }, 60000);
        worker.onerror = (event) => {
          clearTimeout(timer);
          worker.terminate();
          reject(new Error(event.message));
        };
        worker.onmessage = (event) => {
          if (event.data.phase) return;
          clearTimeout(timer);
          worker.terminate();
          resolve(event.data);
        };
        worker.postMessage(
          "CREATE TABLE test (n INTEGER); INSERT INTO test VALUES (7); DO $$ BEGIN RAISE NOTICE 'ready'; END; $$; SELECT SUM(n) AS total FROM test;",
        );
      }),
    workerFile,
  );
  assert.equal(result.status, "passed", JSON.stringify(result));
  assert.match(result.stdout, /ready[\s\S]*total\s+7/);
  console.log(
    "PASS built PostgreSQL worker, WebAssembly assets and procedural output",
  );
} finally {
  await browser.close();
}
