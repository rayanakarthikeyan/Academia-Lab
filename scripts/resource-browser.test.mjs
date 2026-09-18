import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let resource = null;
  let submissions = [];
  await p.route("**/api/**", (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      student = req.headers().authorization === "Bearer student";
    let data = {};
    if (url.searchParams.get("entity") === "resource") {
      if (req.method() === "GET")
        data = {
          resources:
            resource && (!student || resource.is_published) ? [resource] : [],
        };
      else {
        const b = req.postDataJSON();
        resource = {
          ...resource,
          id: "resource-flow",
          title: b.title ?? resource?.title,
          type: b.type ?? resource?.type,
          course_id: b.courseId ?? resource?.course_id,
          course_code: b.courseCode ?? resource?.course_code,
          unit_number: b.unitNumber ?? 1,
          due_date: b.dueDate ?? resource?.due_date,
          curriculum_item_id:
            b.curriculumItemId ?? resource?.curriculum_item_id,
          external_url: b.externalUrl ?? resource?.external_url,
          duration_minutes: 15,
          practice_questions:
            b.practiceQuestions ?? resource?.practice_questions,
          is_published: b.isPublished ?? resource?.is_published,
        };
        data = { resource };
      }
    } else if (url.searchParams.get("entity") === "resource-practice") {
      if (req.method() === "POST") {
        const b = req.postDataJSON();
        const q = resource.practice_questions.find(
          (q) => q.id === b.questionId,
        );
        const record = {
          id: "practice-record",
          author_id: "student-test",
          title: resource.id,
          body: b.code,
          status: "submitted",
          created_at: new Date().toISOString(),
          metadata: {
            questionId: q.id,
            questionTitle: q.title,
            prompt: q.prompt,
            input: b.input,
            output: b.output,
          },
        };
        submissions = [record];
        data = { record };
      } else
        data = {
          records: submissions,
          people: [{ id: "student-test", name: "Test Student" }],
          hasMore: false,
        };
    } else if (url.searchParams.get("entity") === "enrollment")
      data = { enrollments: [] };
    else if (url.searchParams.get("entity") === "activity")
      data = { activity_logs: [] };
    else data = { records: [], hasMore: false };
    return route.fulfill({ json: data });
  });
  const base =
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
    "/scripts/fixtures/resources.html";
  await p.goto(base);
  await p.getByRole("button", { name: "Assign resource", exact: true }).click();
  assert.equal(
    await p.getByText("Choose students", { exact: true }).count(),
    0,
  );
  await p.getByRole("button", { name: "DBMS", exact: true }).click();
  await p.getByRole("button", { name: "Add practice question" }).click();
  const q = p.locator("fieldset");
  assert.deepEqual(await q.locator("select option").allTextContents(), [
    "DBMS (SQL)",
  ]);
  await p.getByRole("button", { name: "Save resource draft" }).click();
  await p.getByText("Draft saved. Students cannot see it.").waitFor();
  assert.equal(resource.is_published, false);
  await p.reload();
  await p.getByRole("button", { name: "Edit resource", exact: true }).click();
  await p.getByLabel("Resource type").selectOption("pdf");
  await p.getByLabel("External URL").fill("https://example.invalid/lesson.pdf");
  await q.getByLabel("Title", { exact: true }).fill("Own data SQL");
  await q
    .getByLabel("Task", { exact: true })
    .fill("Choose two values and show their sum.");
  await q.getByLabel("Starter code").fill("SELECT 2+3 AS total;");
  await q.getByLabel("Require student submission").check();
  assert.equal(
    await q
      .getByLabel("Expected output / visual observations (optional)", {
        exact: true,
      })
      .getAttribute("required"),
    null,
  );
  await p.getByRole("button", { name: "Assign and monitor" }).click();
  await p.getByText(/Resource published to enrolled students/).waitFor();
  assert.equal(resource.practice_questions[0].expectedOutput, "");
  await p.goto(base + "?student");
  await p.getByRole("button", { name: /Own data SQL/ }).click();
  await p.locator(".monaco-editor .view-lines").click();
  await p.keyboard.press("Control+A");
  await p.keyboard.insertText("SELECT 7 + 8 AS total;");
  await p.getByRole("button", { name: "Run", exact: true }).click();
  await p.getByText(/total\s+15/, { exact: true }).waitFor();
  assert.equal(
    await p.getByRole("button", { name: "Check sample cases" }).isDisabled(),
    true,
  );
  await p.getByRole("button", { name: "Submit final", exact: true }).click();
  await p.getByRole("button", { name: "Submitted", exact: true }).waitFor();
  assert.equal(submissions[0].body, "SELECT 7 + 8 AS total;");
  await p.reload();
  await p.getByRole("button", { name: /Own data SQL/ }).click();
  await p.getByRole("button", { name: "Submitted", exact: true }).waitFor();
  await p.goto(base);
  await p
    .getByRole("button", { name: "Practice submissions", exact: true })
    .click();
  await p.getByText(/Test Student · Own data SQL/).click();
  await p.getByText("SELECT 7 + 8 AS total;", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Unpublish", exact: true }).click();
  await p.getByText(/Resource unpublished/).waitFor();
  await p.goto(base + "?student");
  await p.getByText("No published resources").waitFor();
  console.log(
    "PASS course-specific questions, incomplete draft/reload/edit, optional samples, no student picker, own SQL data/output, optional submission/reload lock, faculty review and unpublish visibility",
  );
} finally {
  await browser.close();
}
