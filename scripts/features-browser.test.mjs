import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => console.error(error.message));
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
  if (!process.env.FACULTY_ONLY) {
    await page.route("**/cdn.jsdelivr.net/**", route => route.abort());
    await page.goto(base + "/scripts/fixtures/features.html");
    await page.getByLabel("Practice language").selectOption("sql");
    assert.equal(
      await page
        .getByRole("button", { name: "Java input", exact: false })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "SQL sum", exact: false }).click();
    await page.locator(".monaco-editor .view-lines").waitFor();
    await page.locator(".monaco-editor .view-lines").click();
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText("SELECT 3 + 4 AS edited_total;");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    try {
      await page.getByText(/edited_total\s+7/, { exact: true }).waitFor();
    } catch (error) {
      console.error(await page.locator("body").innerText());
      throw error;
    }
    console.log("PASS: SQL output and language filtering");
    assert.equal(
      await page.getByRole("button", { name: "Submit final" }).count(),
      0,
    );
    await page.getByRole("button", { name: /Back/ }).click();
    await page.getByLabel("Practice language").selectOption("java");
    await page
      .getByRole("button", { name: "Java input", exact: false })
      .click();
    await page.getByLabel("Your input (stdin)").fill("9");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await page.getByText("18", { exact: true }).waitFor({ timeout: 150000 });
    await page.getByRole("button", { name: /Back/ }).click();
    await page.getByLabel("Practice language").selectOption("visual");
    await page
      .getByRole("button", { name: "Traffic signal", exact: false })
      .click();
    await page.getByRole("button", { name: "Run visual preview" }).click();
    const frame = page.frameLocator('iframe[title="Interactive visual lab"]');
    await frame.getByRole("button", { name: "Go", exact: true }).click();
    const lamp = await frame
      .locator("canvas")
      .evaluate((canvas) => [
        ...canvas.getContext("2d").getImageData(90, 240, 1, 1).data,
      ]);
    assert.deepEqual(lamp, [0, 128, 0, 255]);
    assert.equal(
      await frame.locator("body").evaluate(() => {
        try {
          return !!parent.document.body;
        } catch {
          return false;
        }
      }),
      false,
    );
    await frame.locator("body").evaluate(() =>
      setTimeout(() => {
        throw new Error("Visual test error");
      }, 0),
    );
    await page
      .getByRole("alert")
      .filter({ hasText: "Visual test error" })
      .waitFor();
    await page.getByRole("button", { name: "Stop preview" }).click();
    assert.equal(
      await page.locator('iframe[title="Interactive visual lab"]').count(),
      0,
    );
    console.log(
      "PASS: language filters, SQL output, custom Java input, ungraded practice, interactive canvas, origin isolation and Stop.",
    );
  }
  let assignedResource;
  let publishedLab;
  let publishCount = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let body = {};
    if (url.pathname.endsWith("/subjects"))
      body = {
        subjects: [{ id: "java-subject", name: "Java", type: "Theory + Lab" }],
      };
    if (url.pathname.endsWith("/assignments")) {
      if (route.request().method() === "POST") {
        publishCount++;
        const p = route.request().postDataJSON();
        publishedLab = {
          id: "published-lab",
          title: p.title,
          subject_id: p.subjectId,
          due_date: p.dueDate,
          max_marks: p.maxMarks,
          description: p.description,
          starter_code: p.starterCode,
          test_cases: p.testCases,
          assignment_type: p.assignmentType,
          curriculum_item_id: p.curriculumItemId,
          course_code: p.courseCode,
          unit_number: p.unitNumber,
          execution_environment: p.executionEnvironment,
        };
        body = { assignment: publishedLab };
      } else body = { assignments: publishedLab ? [publishedLab] : [] };
    }
    if (
      url.searchParams.get("entity") === "resource" &&
      route.request().method() === "POST"
    ) {
      assignedResource = route.request().postDataJSON();
      body = {
        resource: {
          id: "saved-resource",
          title: assignedResource.title,
          course_id: assignedResource.courseId,
          course_code: assignedResource.courseCode,
          type: assignedResource.type,
          external_url: assignedResource.externalUrl,
          practice_questions: assignedResource.practiceQuestions,
        },
      };
    }
    await route.fulfill({ json: body });
  });
  await page.goto(
    base + "/scripts/fixtures/features.html?view=faculty#faculty",
  );
  await page
    .getByRole("button", { name: "Assign resource", exact: true })
    .click();
  await page.getByLabel("Resource type").selectOption("pdf");
  await page.getByLabel("External URL").fill("https://example.com/study.pdf");
  await page.getByRole("button", { name: "Add practice question" }).click();
  const question = page.locator("fieldset");
  await question.getByLabel("Language").selectOption("sql");
  await question.getByLabel("Title", { exact: true }).fill("SQL task");
  await question.getByLabel("Task", { exact: true }).fill("Compute 2 + 3");
  await question.getByLabel("Expected output / visual observations").fill("5");
  await page.getByRole("button", { name: "Assign and monitor" }).click();
  await page
    .getByText(
      "Resource and practice published to all current and future students.",
    )
    .waitFor();
  assert.equal(assignedResource.practiceQuestions[0].language, "sql");
  assert.deepEqual(assignedResource.assignedUserIds, []);
  await page.goto(base + "/scripts/fixtures/features.html?view=labs#labs");
  const lab = page
    .locator("article")
    .filter({ has: page.getByText("JAVA", { exact: true }) })
    .first();
  await lab.getByTitle("Edit experiment", { exact: true }).click();
  await lab.getByLabel("Execution environment").selectOption("visual");
  await lab
    .getByRole("button", { name: "Use traffic light visual example" })
    .click();
  await lab
    .getByLabel("Expected Output / Observations", { exact: false })
    .fill("Signal changes when clicked");
  await lab
    .getByRole("button", { name: "Publish to all students", exact: true })
    .click();
  await lab
    .getByRole("button", { name: "Published to all students", exact: true })
    .waitFor();
  assert.equal(publishedLab.execution_environment, "visual");
  assert.equal(publishedLab.subject_id, "java-subject");
  assert.equal(
    await lab
      .getByRole("button", { name: "Published to all students", exact: true })
      .isDisabled(),
    true,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Published to all students", exact: true })
    .waitFor();
  assert.equal(publishCount, 1);
  console.log(
    "PASS: faculty resource attachment with no existing students, visual experiment publishing, duplicate prevention and reload state.",
  );
} finally {
  await browser.close();
}
