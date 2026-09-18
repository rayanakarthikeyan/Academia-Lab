import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const context = await browser.newContext();
  let enabled = false;
  const assignment = {
    id: "assigned-java-16",
    curriculum_item_id: "java-lab-16",
    title: "Traffic Lights",
    description: "Signal exercise",
    assignment_type: "lab",
    course_code: "JAVA",
    subject_id: "java-subject",
    unit_number: 4,
    due_date: "2099-12-31",
    max_marks: 10,
    starter_code: "// Signal",
    test_cases: [],
    assigned_user_ids: [],
    questions: [],
    hints: [],
  };
  await context.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    let data = {};
    if (url.searchParams.get("drafts") === "1") data = { drafts: [] };
    else if (url.pathname.endsWith("/assignments")) {
      if (route.request().method() === "PATCH") {
        enabled = route.request().postDataJSON().interactiveEnabled;
        data = { assignment: { ...assignment, interactive_enabled: enabled } };
      } else
        data = {
          assignments: [{ ...assignment, interactive_enabled: enabled }],
        };
    } else if (url.pathname.endsWith("/subjects"))
      data = { subjects: [{ id: "java-subject", name: "Java" }] };
    return route.fulfill({ json: data });
  });
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
  const faculty = await context.newPage(),
    student = await context.newPage();
  await faculty.goto(base + "/scripts/fixtures/features.html#labs");
  await student.goto(
    base + "/scripts/fixtures/features.html?disabled=1#assigned-lab",
  );
  assert.equal(
    await student
      .getByText("Interactive lab experiment", { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await student.getByText(/Complete the manual lab first/).count(),
    0,
  );
  const card = faculty
    .locator("article")
    .filter({ has: faculty.getByText("Traffic Lights", { exact: true }) });
  await card
    .getByRole("button", {
      name: "Manual lab completed — enable interactive activity",
      exact: true,
    })
    .click();
  await student.evaluate(() => window.dispatchEvent(new Event("focus")));
  await student
    .getByText("Interactive lab experiment", { exact: true })
    .waitFor();
  await faculty.reload();
  await card
    .getByRole("button", { name: "Disable interactive activity", exact: true })
    .click();
  await student.evaluate(() => window.dispatchEvent(new Event("focus")));
  await student
    .getByText("Interactive lab experiment", { exact: true })
    .waitFor({ state: "hidden" });
  assert.equal(
    await student
      .getByText("Interactive lab experiment", { exact: true })
      .count(),
    0,
  );
  console.log(
    "PASS faculty enable after manual lab, reload persistence, student live availability, and disable again",
  );
} finally {
  await browser.close();
}
