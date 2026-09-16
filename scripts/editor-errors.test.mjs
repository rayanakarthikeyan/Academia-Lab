import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const b = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
  await p.goto(base + "/scripts/fixtures/features.html");
  if (!process.env.SQL_ONLY) {
    await p.getByRole("button", { name: /Java input/ }).click();
    await p.locator(".monaco-editor .view-lines").click();
    await p.keyboard.press("Control+A");
    await p.keyboard.insertText(
      'public class Main {\n public static void main(String[] args) {\n int number = "wrong";\n }\n}',
    );
    await p
      .getByRole("button", { name: /Line 3:.*(?:convert|mismatch)/i })
      .waitFor({ timeout: 150000 });
    assert.ok((await p.locator(".squiggly-error").count()) > 0);
    await p.getByRole("button", { name: /Line 3:/ }).click();
    await p.getByText(/Ln 3, Col/).waitFor();
    await p.locator(".monaco-editor .view-lines").click();
    await p.keyboard.press("Control+A");
    await p.keyboard.insertText(
      "public class Main { public static void main(String[] args) { int z=0; System.out.println(10/z); } }",
    );
    await p
      .getByText(
        "Java compilation passed. Runtime behavior is checked with Run.",
        { exact: true },
      )
      .waitFor({ timeout: 150000 });
    assert.equal(await p.locator(".squiggly-error").count(), 0);
    await p.getByRole("button", { name: "Run", exact: true }).click();
    await p
      .getByRole("button", { name: /Line 1:.*ArithmeticException/ })
      .waitFor({ timeout: 150000 });
    const only = await p.evaluate(async () => {
      const { runJavaInBrowser } =
        await import("/src/platform/java-browser.ts");
      return runJavaInBrowser(
        "public class Main { public static void main(String[] args) { while(true){} } }",
        "",
        { compileOnly: true },
      );
    });
    assert.equal(only.status, "passed", only.stderr);
    assert.equal(only.stdout, "");
    await p.getByRole("button", { name: /Back/ }).first().click();
    console.log(
      "PASS Java compiler, error navigation, corrected source, runtime lines and compile-only isolation",
    );
  }
  await p.getByRole("button", { name: /SQL sum/ }).click();
  await p.locator(".monaco-editor .view-lines").click();
  await p.keyboard.press("Control+A");
  await p.keyboard.insertText("SELECT 'unfinished");
  // Monaco inserts the closing quote automatically. Remove it to test an actual error.
  await p.keyboard.press("End");
  await p.keyboard.press("Backspace");
  await p.getByRole("button", { name: /Line 1: Unclosed string/ }).waitFor();
  await p.keyboard.press("Control+A");
  await p.keyboard.insertText("SELECT * FROM missing_table;");
  await p.getByRole("button", { name: "Run", exact: true }).click();
  await p
    .getByText(/no such table: missing_table/)
    .first()
    .waitFor();
  console.log("PASS SQL live structure and run errors");
} finally {
  await b.close();
}
