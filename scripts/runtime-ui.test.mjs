import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const page = await browser.newPage();
  const events = [];
  await page.route("**/api/platform?entity=activity", (route) => {
    events.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
      "/scripts/fixtures/features.html?telemetry=1",
  );
  await page.getByRole("button", { name: /SQL sum/ }).click();
  await page.getByLabel("SQL engine").selectOption("postgres");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page
    .getByText(/total\s+5/, { exact: true })
    .waitFor({ timeout: 60000 });
  await page.getByLabel("SQL engine").selectOption("sqlite");
  await page.getByText(/Code, input, files or engine changed/).waitFor();
  await page.getByRole("button", { name: /Back/ }).click();
  await page.getByRole("button", { name: /Java input/ }).click();
  await page
    .getByLabel("Upload program files")
    .setInputFiles({
      name: "input.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("student-file"),
    });
  await page.getByText("input.txt", { exact: true }).waitFor();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    'import java.io.*; public class CopyFile { public static void main(String[] args) throws Exception { try (InputStream in = new FileInputStream("input.txt"); OutputStream out = new FileOutputStream("copy.txt")) { int c; while ((c = in.read()) != -1) out.write(c); } System.out.println("Copied"); } }',
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const downloadButton = page.getByRole("button", {
    name: "Download copy.txt",
    exact: true,
  });
  await downloadButton.waitFor({ timeout: 150000 });
  const pending = page.waitForEvent("download");
  await downloadButton.click();
  const download = await pending;
  assert.equal(
    (await readFile(await download.path())).toString(),
    "student-file",
  );
  await page.getByRole("button", { name: "Clear files" }).click();
  await page.getByText(/Code, input, files or engine changed/).waitFor();
  await page.waitForTimeout(1000);
  assert.ok(events.some((event) => event.metadata?.runtime === "postgres"));
  assert.ok(
    events.some(
      (event) =>
        event.metadata?.runtime === "java8" &&
        event.metadata.contextDigest?.length === 64,
    ),
  );
  assert.ok(
    !JSON.stringify(events).includes(
      Buffer.from("student-file").toString("base64"),
    ),
  );
  console.log(
    "PASS engine selector, Java upload/download, stale evidence, runtime telemetry and file-content privacy",
  );
} finally {
  await browser.close();
}
