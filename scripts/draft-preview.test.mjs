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
    viewport: { width: 1440, height: 1000 },
  });
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
  let saved;
  let published = 0;
  const events = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let data = {};
    if (url.searchParams.get("drafts") === "1") {
      if (route.request().method() === "POST") {
        const { draft } = route.request().postDataJSON();
        saved = {
          id: "faculty-draft:test:" + draft.id,
          faculty_id: "test",
          draft,
          updated_at: new Date().toISOString(),
        };
        data = { draft: saved };
      } else data = { drafts: saved ? [saved] : [] };
    } else if (url.pathname.endsWith("/assignments")) {
      if (route.request().method() === "POST") published++;
      data = { assignments: [] };
    } else if (url.pathname.endsWith("/subjects"))
      data = {
        subjects: [{ id: "dbms-subject", name: "DBMS", type: "Theory + Lab" }],
      };
    else if (url.searchParams.get("entity") === "activity") {
      events.push(route.request().postDataJSON());
      data = { ok: true };
    }
    await route.fulfill({ json: data });
  });
  await page.goto(base + "/scripts/fixtures/features.html?view=labs#labs");
  const lab = page
    .locator("article")
    .filter({ has: page.getByText("DBMS", { exact: true }) })
    .first();
  await lab.getByTitle("Edit experiment", { exact: true }).click();
  await lab
    .getByLabel("Experiment Title", { exact: true })
    .fill("Tester draft SQL check");
  await lab
    .getByLabel("Starter Code", { exact: false })
    .fill("SELECT 17 AS draft_result;");
  await lab.getByRole("button", { name: "Save draft for tester" }).click();
  await page.getByText(/Draft saved for tester preview/).waitFor();
  assert.equal(published, 0);
  await page.reload();
  await page.getByText("Tester draft SQL check", { exact: true }).waitFor();
  await page.goto(base + "/scripts/fixtures/studio.html");
  await page.getByRole("button", { name: /Tester draft SQL check/ }).click();
  await page.getByText(/Unpublished faculty draft · tester preview/).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Submit final", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByText(/draft_result\s+17/, { exact: true }).waitFor();
  await page.waitForTimeout(1000);
  assert.ok(
    events.some(
      (e) =>
        e.metadata?.draftId === saved.id &&
        e.kind === "code_run" &&
        !e.assignmentId,
    ),
  );
  console.log(
    "PASS faculty saves without publication, draft survives reload, tester executes saved source without submission, telemetry identifies draft",
  );
} finally {
  await browser.close();
}
