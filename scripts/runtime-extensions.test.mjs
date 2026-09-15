import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
});
try {
  const page = await browser.newPage();
  await page.route("**/__runtime-test__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Runtime checks</title>",
    }),
  );
  await page.goto(
    (process.env.TEST_BASE_URL || "http://127.0.0.1:5173") +
      "/__runtime-test__",
  );
  const results = await page.evaluate(async () => {
    const { runCode } = await import("/src/platform/api.ts");
    const { postgresExamples } =
      await import("/src/platform/postgres-examples.ts");
    const results = {};
    for (const [name, code] of Object.entries(postgresExamples))
      results[name] = await runCode("", {
        language: "sql",
        sqlEngine: "postgres",
        code,
        stdin: "",
      });
    results.isolated = await runCode("", {
      language: "sql",
      sqlEngine: "postgres",
      code: "SELECT * FROM accounts;",
      stdin: "",
    });
    results.invalid = await runCode("", {
      language: "sql",
      sqlEngine: "postgres",
      code: "not SQL;",
      stdin: "",
    });
    const controller = new AbortController();
    results.cancelled = await runCode(
      "",
      {
        language: "sql",
        sqlEngine: "postgres",
        code: "SELECT pg_sleep(30);",
        stdin: "",
      },
      {
        signal: controller.signal,
        onProgress: (phase) => {
          if (phase === "Running SQL…")
            setTimeout(() => controller.abort(), 100);
        },
      },
    );
    return results;
  });
  for (const name of ["Procedure", "Cursor", "ANY and ALL", "Trigger"])
    assert.equal(
      results[name].status,
      "passed",
      name + JSON.stringify(results[name]),
    );
  assert.match(results.Procedure.stdout, /1 \| 150/);
  assert.match(results.Cursor.stdout, /Asha: 80[\s\S]*Ravi: 90/);
  assert.match(results["ANY and ALL"].stdout, /true \| false/);
  assert.match(results.Trigger.stdout, /INSERT[\s\S]*UPDATE/);
  assert.equal(results.isolated.status, "error");
  assert.equal(results.invalid.status, "error");
  assert.match(results.cancelled.stderr, /stopped/);
  console.log(
    "PASS PostgreSQL procedures, cursors, ANY/ALL, triggers, errors, isolation and cancellation",
  );
  const java = await page.evaluate(async () => {
    const { runCode } = await import("/src/platform/api.ts");
    const code = `package labs; import java.io.*; import java.util.*;
// public class IncorrectName is only a comment.
public class FileSplitter { public static void main(String[] args) throws Exception {
String name = new Scanner(System.in).nextLine(); File input = new File(name);
System.out.println(input.exists() + " " + input.length());
try (InputStream in = new FileInputStream(input); OutputStream a = new FileOutputStream("part1.txt"); OutputStream b = new FileOutputStream("part2.txt")) {
int value, count = 0; while ((value = in.read()) != -1) { (count++ < 3 ? a : b).write(value); }
}
}}`;
    const files = [{ name: "input.txt", base64: btoa("abcdef") }];
    const valid = await runCode(
      "",
      { language: "java", code, stdin: "input.txt" },
      { files },
    );
    const invalid = await runCode(
      "",
      { language: "java", code, stdin: "input.txt" },
      { files: [{ name: "../escape.txt", base64: "" }] },
    );
    return { valid, invalid };
  });
  assert.equal(java.valid.status, "passed", JSON.stringify(java.valid));
  assert.equal(java.valid.stdout.trim(), "true 6");
  assert.equal(
    Buffer.from(
      java.valid.files.find((file) => file.name === "part1.txt").base64,
      "base64",
    ).toString(),
    "abc",
  );
  assert.equal(
    Buffer.from(
      java.valid.files.find((file) => file.name === "part2.txt").base64,
      "base64",
    ).toString(),
    "def",
  );
  assert.equal(java.invalid.status, "error");
  console.log(
    "PASS Java uploaded files, filename input, metadata, splitting, downloadable bytes and path rejection",
  );
  const jdbc = await page.evaluate(async () => {
    const { runCode } = await import("/src/platform/api.ts");
    const { jdbcStarter } = await import("/src/platform/java-support.ts");
    const results = [];
    for (const stdin of ["Asha", "O'Brien"])
      results.push(
        await runCode("", { language: "java", code: jdbcStarter, stdin }),
      );
    results.push(
      await runCode("", {
        language: "java",
        stdin: "",
        code: `import java.sql.*; public class Main { public static void main(String[] args) throws Exception { Class.forName("org.h2.Driver"); try (Connection c = DriverManager.getConnection("jdbc:h2:mem:lab", "sa", ""); Statement s = c.createStatement()) { s.executeQuery("SELECT * FROM students"); } } }`,
      }),
    );
    return results;
  });
  assert.equal(jdbc[0].status, "passed", JSON.stringify(jdbc[0]));
  assert.equal(jdbc[0].stdout.trim(), "1 ASHA\nDeleted: 1");
  assert.equal(jdbc[1].status, "passed", JSON.stringify(jdbc[1]));
  assert.equal(jdbc[1].stdout.trim(), "1 O'BRIEN\nDeleted: 1");
  assert.equal(jdbc[2].status, "error");
  assert.match(jdbc[2].stderr, /not found|empty/i);
  console.log(
    "PASS real H2 JDBC CRUD, prepared parameters, changed user input and fresh database isolation",
  );
} finally {
  await browser.close();
}
