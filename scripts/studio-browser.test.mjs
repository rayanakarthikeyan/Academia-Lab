import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
  const events = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/platform?entity=activity", (route) => {
    events.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
  await page.goto(base + "/scripts/fixtures/studio.html");
  const open = async (course, n) =>
    page
      .getByRole("button", { name: new RegExp(`${course} · Lab ${n}\\b`) })
      .click();
  const back = async () =>
    page
      .getByRole("button", { name: "Back to learning studio", exact: true })
      .click();
  await open("JAVA", 1);
  await page.getByLabel("Prime limit").fill("10");
  await page.getByRole("button", { name: "Start Java debugger" }).click();
  await page
    .getByText("Paused at candidate", { exact: true })
    .waitFor({ timeout: 150000 });
  assert.equal(
    await page.locator('iframe[title="Isolated Java compiler"]').count(),
    1,
  );
  await page.waitForTimeout(500);
  await page.getByText("Paused at candidate", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page.getByText("Paused at decision", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Continue to breakpoint" }).click();
  await page.getByText("Paused at composite", { exact: true }).waitFor();
  await page.getByLabel("Prime prediction").selectOption("no");
  await page.getByRole("button", { name: "Check prediction" }).click();
  await page
    .getByText("Correct. Follow the comparisons to explain why.")
    .waitFor();
  await page.getByRole("button", { name: "Run to end" }).click();
  await page.getByText("2\n3\n5\n7", { exact: true }).waitFor();
  assert.equal(
    await page.locator('iframe[title="Isolated Java compiler"]').count(),
    0,
  );
  await back();
  console.log(
    "PASS live Java pause, Step, breakpoint, variables, prediction, real prime output and cleanup",
  );
  await open("DBMS", 1);
  await page.getByRole("button", { name: "Add entity", exact: true }).click();
  await page.getByLabel("Entity 3 name", { exact: true }).fill("loans");
  await page
    .getByLabel("Entity 3 attributes", { exact: true })
    .fill("loan_id, member_id, book_id");
  await page
    .getByLabel("Entity 3 primary key", { exact: true })
    .fill("loan_id");
  for (const [i, parent, fk] of [
    [1, "members", "member_id"],
    [2, "books", "book_id"],
  ]) {
    await page
      .getByRole("button", { name: "Add relationship", exact: true })
      .click();
    await page
      .getByLabel(`Relationship ${i} from`, { exact: true })
      .selectOption(parent);
    await page
      .getByLabel(`Relationship ${i} to`, { exact: true })
      .selectOption("loans");
    await page
      .getByLabel(`Relationship ${i} foreign key`, { exact: true })
      .fill(fk);
  }
  await page.getByRole("button", { name: "Validate design" }).click();
  await page.getByText(/Library mission complete/).waitFor();
  await page.getByRole("button", { name: "Run design SQL" }).click();
  await page
    .getByLabel("Design SQL output")
    .getByText(/loans/)
    .waitFor({ timeout: 60000 });
  await page
    .getByLabel("Entity 3 primary key", { exact: true })
    .fill("missing");
  await page.getByRole("button", { name: "Validate design" }).click();
  await page.getByText(/include one primary key/).waitFor();
  await back();
  await open("DBMS", 3);
  await page.getByLabel("Dependency prediction").selectOption("student");
  await page.getByRole("button", { name: "Check dependency" }).click();
  await page.getByText(/Correct. Student name/).waitFor();
  await page.getByRole("button", { name: "Decompose and verify" }).click();
  await page.getByRole("button", { name: "Run design SQL" }).click();
  await page
    .getByLabel("Design SQL output")
    .getByText(/missing_or_extra_rows\s+0/)
    .waitFor({ timeout: 60000 });
  await page.getByLabel("Row 2 student", { exact: true }).fill("Different");
  await page.getByRole("button", { name: "Decompose and verify" }).click();
  await page.getByText(/Functional dependency violated/).waitFor();
  await back();
  console.log(
    "PASS ER relationships and SQL, invalid keys, normalization reconstruction and dependency violations",
  );
  await open("JAVA", 10);
  await page.getByRole("button", { name: "Divide", exact: true }).click();
  await page.getByText("Quotient: 4", { exact: true }).waitFor();
  await page.getByLabel("Divisor", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Divide", exact: true }).click();
  await page.getByText(/ArithmeticException: integer division/).waitFor();
  await page.getByLabel("Divisor", { exact: true }).fill("text");
  await page.getByRole("button", { name: "Divide", exact: true }).click();
  await page.getByText(/NumberFormatException: enter/).waitFor();
  await back();
  await open("JAVA", 16);
  for (const color of ["red", "yellow", "green"]) {
    await page.getByRole("radio", { name: color, exact: true }).check();
    await page.getByRole("button", { name: "Check signal" }).click();
    await page.getByText(/^Correct:/).waitFor();
  }
  await back();
  await open("JAVA", 17);
  for (const kind of ["entered", "pressed", "released", "clicked", "exited"])
    await page
      .getByRole("button", { name: `Simulate ${kind}`, exact: true })
      .click();
  assert.match(
    await page.getByLabel("Event timeline").innerText(),
    /pressed[\s\S]*released/,
  );
  await back();
  await open("JAVA", 18);
  await page.getByLabel("Keyboard capture").press("a");
  await page.getByRole("button", { name: "Enter", exact: true }).click();
  assert.match(
    await page.getByLabel("Event timeline").innerText(),
    /keyPressed[\s\S]*keyReleased/,
  );
  await back();
  await open("JAVA", 19);
  for (const key of ["8", "/", "2", "="])
    await page.getByRole("button", { name: key, exact: true }).click();
  assert.equal(await page.getByLabel("Calculator display").innerText(), "4");
  await back();
  await open("JAVA", 20);
  await page.getByRole("button", { name: "init()", exact: true }).click();
  await page.getByRole("button", { name: "start()", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "destroy()", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByLabel("Applet message").fill("Hello learners");
  await page.getByLabel("Applet canvas").getByText("Hello learners").waitFor();
  await page.getByRole("button", { name: "stop()", exact: true }).click();
  await page.getByRole("button", { name: "destroy()", exact: true }).click();
  await back();
  await open("JAVA", 21);
  await page.getByLabel("Factorial input").fill("5");
  await page.getByLabel("Factorial prediction").fill("120");
  await page.getByRole("button", { name: "Run factorial" }).click();
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "Next multiplication" }).click();
  await page.getByText("5: result × 5 = 120", { exact: true }).waitFor();
  await page
    .getByLabel("Simulation reflection")
    .fill("The result accumulates each factor.");
  await page.getByLabel("Simulation reflection").blur();
  await back();
  console.log(
    "PASS all seven GUI/Applet simulations, event sequences, lifecycle, arithmetic and reflection",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [course, n] of [
      ["JAVA", 1],
      ["DBMS", 1],
      ["DBMS", 3],
      ["JAVA", 10],
      ["JAVA", 16],
      ["JAVA", 17],
      ["JAVA", 18],
      ["JAVA", 19],
      ["JAVA", 20],
      ["JAVA", 21],
    ]) {
      await open(course, n);
      await page.waitForTimeout(80);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${course} ${n} overflow at ${width}`,
      );
      await back();
    }
  }
  await mkdir(new URL("../tmp/", import.meta.url), { recursive: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await open("JAVA", 16);
  await page.screenshot({
    path: fileURLToPath(new URL("../tmp/studio-mobile.png", import.meta.url)),
    fullPage: true,
  });
  await page.waitForTimeout(800);
  assert.ok(events.some((e) => e.metadata?.action === "debug_pause"));
  assert.ok(events.some((e) => e.metadata?.missionComplete === true));
  assert.ok(events.some((e) => e.metadata?.action === "simulation_reflection"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS 320/390/768/1440 layouts, accessible controls and learning evidence delivery",
  );
} finally {
  await browser.close();
}
