import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const b = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  let submission;
  await p.route("**/api/**", (r) => {
    if (r.request().url().includes("/learning")) {
      submission = r.request().postDataJSON();
      return r.fulfill({
        json: {
          record: {
            id: "submission-test",
            ...submission,
            metadata: submission.metadata,
          },
        },
      });
    }
    return r.fulfill({ json: { ok: true } });
  });
  await p.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
      "/scripts/fixtures/features.html#assigned-lab",
  );
  await p.getByRole("button", { name: "Submit final", exact: true }).click();
  await p
    .getByText(
      "Complete the interactive lab and write your observations before submitting.",
      { exact: true },
    )
    .waitFor();
  assert.equal(submission, undefined);
  await p.getByRole("radio", { name: "green", exact: true }).check();
  await p
    .getByLabel("Lab observations and explanation")
    .fill("Green allows vehicles to proceed when the crossing is clear.");
  await p.getByRole("button", { name: "Save draft", exact: true }).click();
  await p.getByText("Draft saved.", { exact: true }).waitFor();
  assert.equal(submission.metadata.lab_evidence.signal_selected.color, "green");
  await p.getByRole("button", { name: "Submit final", exact: true }).click();
  await p.getByText("Work submitted successfully.", { exact: true }).waitFor();
  assert.equal(submission.status, "submitted");
  assert.equal(submission.assignmentId, "assigned-java-16");
  assert.equal(submission.metadata.interactive_lab, true);
  assert.match(submission.metadata.lab_report, /Green allows/);
  assert.ok(
    await p.getByRole("radio", { name: "green", exact: true }).isDisabled(),
  );
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  console.log(
    "PASS assigned simulation requires report, saves evidence, submits under correct assignment, locks controls and fits mobile",
  );
} finally {
  await b.close();
}
