import assert from "node:assert/strict";

// Explicit opt-in only. This check signs in and reads; it never publishes,
// registers accounts, submits work, or modifies the hosted database.
const base = process.env.LIVE_TEST_URL?.replace(/\/$/, "");
const email = process.env.LIVE_FACULTY_EMAIL;
const password = process.env.LIVE_FACULTY_PASSWORD;
assert.ok(
  base && new URL(base).protocol === "https:",
  "Set LIVE_TEST_URL to the HTTPS deployment to verify",
);
assert.ok(
  email && password,
  "Set LIVE_FACULTY_EMAIL and LIVE_FACULTY_PASSWORD",
);
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const health = await fetch(base + "/api/health", {
  signal: AbortSignal.timeout(30000),
});
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);
const anonymous = await fetch(base + "/api/assignments", {
  signal: AbortSignal.timeout(30000),
});
assert.equal(anonymous.status, 401);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  const failures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(base + "/api/") && response.status() >= 400)
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto(base);
  await page.getByLabel("Email address").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Enrollment management", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Enrollment management", exact: true })
    .waitFor();
  for (const name of [
    "Enrollment management",
    "Theory resources",
    "Lab Workspace",
    "Interactive Lab",
    "Student insights",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForLoadState("networkidle");
    assert.deepEqual(failures, [], `${name}: hosted API failures`);
  }
  assert.deepEqual(errors, []);
  await page.getByTitle("Sign out", { exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  console.log(
    "PASS live HTTPS, health, anonymous access denial, faculty UI sign-in, session restoration, five faculty views, hosted database reads and sign-out",
  );
} finally {
  await browser.close();
}
